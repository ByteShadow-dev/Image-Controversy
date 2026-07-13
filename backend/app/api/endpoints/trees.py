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
    nodes = await image_collection.find({"tree_id": ObjectId(tree_id)}).to_list(None)

    return TreeResponse(
        tree=Tree.model_validate(tree),
        nodes=[ImageNode.model_validate(node) for node in nodes]
    )
