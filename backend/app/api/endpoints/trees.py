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
    tree = Tree(title=request.title)
    tree_dict = tree.model_dump(by_alias=True, exclude_none=True)
    result = await tree_collection.insert_one(tree_dict)
    tree.id = result.inserted_id
    return tree

@router.get("/", response_model=List[Tree])
async def get_all_trees():
    trees = await tree_collection.find().to_list(None)
    return trees

@router.get("/{tree_id}", response_model=TreeResponse)
async def get_tree(tree_id: str):
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")
        
    tree = await tree_collection.find_one({"_id": ObjectId(tree_id)})
    if tree is None:
        raise HTTPException(status_code=404, detail="Tree not found")

    # In the database, tree_id is stored as ObjectId. Query using ObjectId.
    nodes = await image_collection.find({"tree_id": ObjectId(tree_id)}).to_list(None)

    return TreeResponse(
        tree=Tree(**tree),
        nodes=[ImageNode(**node) for node in nodes]
    )
