from fastapi import APIRouter, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.database import get_database
from app.models.tree import CreateTreeRequest, Tree, TreeResponse
from app.models.image import ImageNode

router = APIRouter(prefix="/tree", tags=["Trees"])

tree_collection = get_database("trees")
image_collection = get_database("images")

@router.post("/", response_model=Tree, status_code=status.HTTP_201_CREATED)
async def create_tree(request: CreateTreeRequest):
    # A tree is the top-level container for one image exploration session.
    # We create the document first, then return the stored record with its id.
    tree = Tree.model_validate({"title": request.title})
    tree_dict = tree.model_dump(by_alias=True, exclude_none=True)
    result = await tree_collection.insert_one(tree_dict)
    tree.id = result.inserted_id
    return tree

@router.get("/", response_model=List[Tree])
async def get_all_trees():
    # The frontend uses this to list all saved image trees.
    trees = await tree_collection.find().to_list(None)
    return trees

@router.get("/{tree_id}", response_model=TreeResponse)
async def get_tree(tree_id: str):
    # A tree response includes the tree document plus every image node that
    # belongs to it. Nodes are linked by tree_id in the images collection.
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")
        
    tree = await tree_collection.find_one({"_id": ObjectId(tree_id)})
    if tree is None:
        raise HTTPException(status_code=404, detail="Tree not found")

    # Query with ObjectId so the lookup matches how the tree relationship is stored.
    # A stable order makes the version graph deterministic when sibling edits
    # are created concurrently.
    nodes = await image_collection.find({"tree_id": ObjectId(tree_id)}).sort(
        "created_at", 1
    ).to_list(None)

    return TreeResponse(
        tree=Tree.model_validate(tree),
        nodes=[ImageNode.model_validate(node) for node in nodes]
    )


@router.delete("/{tree_id}", status_code=status.HTTP_200_OK)
async def delete_tree(tree_id: str):
    """Delete a project and every version node it owns."""
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")

    result = await tree_collection.delete_one({"_id": ObjectId(tree_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tree not found")

    nodes_result = await image_collection.delete_many({"tree_id": ObjectId(tree_id)})
    return {"deleted_tree_id": tree_id, "deleted_node_count": nodes_result.deleted_count}


@router.delete("/{tree_id}/nodes/{node_id}", status_code=status.HTTP_200_OK)
async def delete_tree_node(tree_id: str, node_id: str):
    """Delete a node and all descendants in its version branch."""
    if not ObjectId.is_valid(tree_id) or not ObjectId.is_valid(node_id):
        raise HTTPException(status_code=400, detail="Invalid Tree or node ID format")

    node = await image_collection.find_one({
        "_id": ObjectId(node_id),
        "tree_id": ObjectId(tree_id),
    })
    if node is None:
        raise HTTPException(status_code=404, detail="Version node not found")

    node_ids = [node_id]
    pending_ids = [node_id]
    seen_ids = {node_id}
    while pending_ids:
        children = await image_collection.find({
            "tree_id": ObjectId(tree_id),
            "parent_id": {"$in": pending_ids},
        }).to_list(None)
        pending_ids = [
            str(child["_id"])
            for child in children
            if str(child["_id"]) not in seen_ids
        ]
        seen_ids.update(pending_ids)
        node_ids.extend(pending_ids)

    await image_collection.delete_many({"_id": {"$in": [ObjectId(id_) for id_ in node_ids]}})

    if str(node.get("parent_id") or "") == "":
        await tree_collection.update_one(
            {"_id": ObjectId(tree_id)},
            {"$set": {"root_node_id": None}},
        )

    return {
        "deleted_node_ids": node_ids,
        "parent_id": node.get("parent_id"),
    }
