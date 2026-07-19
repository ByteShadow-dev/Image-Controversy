import os
import shutil
import hashlib
from typing import Optional
from fastapi import UploadFile, HTTPException, status
from bson import ObjectId
from app.core.database import get_database
from app.models.image import ImageNode, ParsedInstructionResponse

tree_collection = get_database("trees")
image_collection = get_database("images")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

def get_file_hash(file_path: str) -> str:
    """Compute the SHA-256 hash of a file on disk."""
    if not os.path.exists(file_path):
        return ""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

async def validate_tree(tree_id: str):
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")
    tree = await tree_collection.find_one({"_id": ObjectId(tree_id)})
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree

async def get_image(image_id: str, tree_id: Optional[str] = None):
    if not ObjectId.is_valid(image_id):
        raise HTTPException(status_code=400, detail="Invalid Image ID format")
    image = await image_collection.find_one({"_id": ObjectId(image_id)})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    if tree_id and str(image.get("tree_id")) != tree_id:
        raise HTTPException(
            status_code=404,
            detail="Image does not belong to this version tree",
        )
    return image

async def save_uploaded_image(upload_file: UploadFile, tree_id: str, image_id: str) -> str:
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Create a unique filename
    filename = f"{tree_id}_{image_id}_{upload_file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )
    return file_path

def load_image(image_path: str):
    if not os.path.exists(image_path):
        raise HTTPException(
            status_code=404,
            detail=f"Image file not found on disk at {image_path}"
        )
    return image_path

def store_output_image(image_data: bytes, filename: str) -> str:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, filename)
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(image_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save output image: {str(e)}"
        )
    return file_path

async def create_child_node(
    tree_id: str,
    parent_id: Optional[str],
    image_path: str,
    instruction: str,
    explanation: str,
    category: str = "Edit",
    status_str: str = "Completed",
    image_hash: Optional[str] = None,
):
    """
    Persist a new child ImageNode in the database.

    Parameters
    ----------
    category : str
        The Groq-classified category (e.g. "Background Removal", "Tone & Colour").
        Defaults to "Edit" for manually-uploaded nodes.
    """
    node = ImageNode(
        tree_id=ObjectId(tree_id) if ObjectId.is_valid(tree_id) else tree_id,
        parent_id=parent_id,
        image_path=image_path,
        edit=ParsedInstructionResponse(
            tree_id=ObjectId(tree_id) if ObjectId.is_valid(tree_id) else tree_id,
            category=category,
            operation=instruction,
            image_path=image_path,
            explanation=explanation,
        ),
        status=status_str,
        image_hash=image_hash,
        explanation=explanation,
    )
    result = await image_collection.insert_one(node.model_dump(by_alias=True, exclude_none=True))
    node.id = result.inserted_id
    return node
