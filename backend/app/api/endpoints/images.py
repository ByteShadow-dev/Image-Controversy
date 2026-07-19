"""
images.py
=========
FastAPI router for image-node operations.

Endpoints
---------
GET  /images/{image_id}               – fetch a single image node
POST /images/parse                    – classify a prompt (Groq only, no edit)
POST /images/{tree_id}/root           – upload the root image for a new tree
POST /images/{tree_id}/{image_id}     – manually upload a child image
POST /images/{tree_id}/{image_id}/edit – run the editing pipeline on a node
"""

import os
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Depends
from bson import ObjectId
from app.core.database import get_database
from app.models.image import (
    ParsedInstructionResponse,
    ImageNode,
    EditImageRequest,
)
from app.services.groq_service import parse_instruction
from app.services.image_service import (
    validate_tree,
    get_image,
    save_uploaded_image,
    load_image,
    create_child_node,
    get_file_hash,
)
from app.services.image_editor import ImageEditorInterface, PipelineImageEditor

router = APIRouter(prefix="/images", tags=["Images"])

tree_collection = get_database("trees")
image_collection = get_database("images")


# ---------------------------------------------------------------------------
# Dependency injection – swap PipelineImageEditor for a mock in tests
# ---------------------------------------------------------------------------

def get_image_editor() -> ImageEditorInterface:
    return PipelineImageEditor()


# ---------------------------------------------------------------------------
# Expose the Groq classifier as a standalone route (useful for debugging /
# building richer UIs that preview the parse result before editing).
# ---------------------------------------------------------------------------

router.post(
    "/parse",
    response_model=ParsedInstructionResponse,
    status_code=status.HTTP_200_OK,
)(parse_instruction)


# ---------------------------------------------------------------------------
# Root image upload
# ---------------------------------------------------------------------------

@router.post("/{tree_id}/root")
async def upload_root_image(
    tree_id: str,
    file: UploadFile = File(...),
):
    """
    Upload the original image for a tree session.
    Creates the root ImageNode, links it back to the tree document, and
    returns the node id so the frontend can set activeNodeId.
    """
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")

    tree = await validate_tree(tree_id)
    if tree.get("root_node_id"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This version tree already has a root image",
        )

    image_id = str(ObjectId())
    saved_path = await save_uploaded_image(file, tree_id, image_id)

    # Compute hash and check deduplication
    file_hash = get_file_hash(saved_path)
    existing_node = await image_collection.find_one({"image_hash": file_hash})
    is_new = True
    if existing_node:
        try:
            os.remove(saved_path)
        except Exception:
            pass
        saved_path = existing_node["image_path"]
        is_new = False

    node = ImageNode(
        id=ObjectId(image_id),
        tree_id=tree_id,
        parent_id=None,
        image_path=saved_path,
        edit=ParsedInstructionResponse(
            tree_id=tree_id,
            category="Original",
            operation="Original",
            image_path=saved_path,
            explanation="Original uploaded image.",
        ),
        status="Completed",
        image_hash=file_hash,
        explanation="Original uploaded image.",
    )

    try:
        result = await image_collection.insert_one(
            node.model_dump(by_alias=True, exclude_none=True)
        )

        await tree_collection.update_one(
            {"_id": ObjectId(tree_id)},
            {"$set": {"root_node_id": str(result.inserted_id)}},
        )
    except Exception as e:
        if is_new and os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {str(e)}")

    return {"node_id": str(result.inserted_id)}


# ---------------------------------------------------------------------------
# Manual child image upload (no pipeline, raw file upload)
# ---------------------------------------------------------------------------

@router.post("/{tree_id}/{image_id}", response_model=ImageNode)
async def upload_child_image(
    tree_id: str,
    image_id: str,
    file: UploadFile = File(...),
):
    """
    Manually upload a new child image node without running the AI pipeline.
    Useful for branching from an externally-edited file.
    """
    await validate_tree(tree_id)
    await get_image(image_id, tree_id)

    saved_path = await save_uploaded_image(file, tree_id, image_id)

    # Compute hash and check deduplication
    file_hash = get_file_hash(saved_path)
    existing_node = await image_collection.find_one({"image_hash": file_hash})
    is_new = True
    if existing_node:
        try:
            os.remove(saved_path)
        except Exception:
            pass
        saved_path = existing_node["image_path"]
        is_new = False

    try:
        node = await create_child_node(
            tree_id=tree_id,
            parent_id=image_id,
            image_path=saved_path,
            instruction=f"Upload file: {file.filename}",
            explanation="Manually uploaded child image node.",
            image_hash=file_hash,
        )
    except Exception as e:
        if is_new and os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    return node


# ---------------------------------------------------------------------------
# AI pipeline edit — the main route wired to the chat prompt
# ---------------------------------------------------------------------------

@router.post("/{tree_id}/{image_id}/edit", response_model=ImageNode)
async def edit_child_image(
    tree_id: str,
    image_id: str,
    request: EditImageRequest,
    editor: ImageEditorInterface = Depends(get_image_editor),
):
    """
    Editing flow:
      1. Validate tree + source node.
      2. Pass the prompt and image through PipelineImageEditor:
           Groq classification → PROCESSOR_REGISTRY dispatch → EditProcessor.
      3. Persist the output as a new child ImageNode.
      4. Return the new node (id, image_path, edit metadata, status).

    The frontend adds this node to the version tree and shows the
    processed image in the chat panel.
    """
    await validate_tree(tree_id)

    source_node = await get_image(image_id, tree_id)
    source_path = source_node.get("image_path")
    if not source_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source image node does not specify an image path.",
        )

    # Verify the file actually exists on disk before processing
    load_image(source_path)

    # Run through the modular pipeline
    edit_result = await editor.edit(
        image_path=source_path,
        instruction=request.instruction,
        tree_id=tree_id,
    )

    # Verify output exists on disk
    load_image(edit_result.output_image_path)

    output_path = edit_result.output_image_path

    # Compute hash and check deduplication
    file_hash = get_file_hash(output_path)
    existing_node = await image_collection.find_one({"image_hash": file_hash})
    is_new = True
    if existing_node:
        try:
            os.remove(output_path)
        except Exception:
            pass
        output_path = existing_node["image_path"]
        is_new = False

    try:
        new_node = await create_child_node(
            tree_id=tree_id,
            parent_id=image_id,
            image_path=output_path,
            instruction=request.instruction,
            explanation=edit_result.explanation,
            category=edit_result.category,
            image_hash=file_hash,
        )
    except Exception as e:
        if is_new and os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

    return new_node


# ---------------------------------------------------------------------------
# Get a single image node by id
# ---------------------------------------------------------------------------

@router.get("/{image_id}", response_model=ImageNode)
async def get_image_node(image_id: str):
    if not ObjectId.is_valid(image_id):
        raise HTTPException(status_code=400, detail="Invalid Image ID format")
    node = await image_collection.find_one({"_id": ObjectId(image_id)})
    if not node:
        raise HTTPException(status_code=404, detail="Image node not found")
    return node
