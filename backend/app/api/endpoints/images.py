from fastapi import APIRouter, HTTPException, status, UploadFile, File, Depends
from bson import ObjectId
from app.core.database import get_database
from app.models.image import (
    InstructionRequest,
    ParsedInstructionResponse,
    EditedImageResponse,
    RootImageRequest,
    ImageNode,
    ChildImageRequest,
    EditImageRequest
)
from app.services.groq_service import parse_instruction, edit_image
from app.services.image_service import (
    validate_tree,
    get_image,
    save_uploaded_image,
    load_image,
    store_output_image,
    create_child_node
)
from app.services.image_editor import ImageEditorInterface, DefaultImageEditor

router = APIRouter(prefix="/images", tags=["Images"])

tree_collection = get_database("trees")
image_collection = get_database("images")

def get_image_editor() -> ImageEditorInterface:
    return DefaultImageEditor()

# These endpoints expose the AI-backed editing pipeline directly.
# The request is first parsed into structured instructions, then the edit is executed.
router.post(
    "/parse",
    response_model=ParsedInstructionResponse,
    status_code=status.HTTP_200_OK,
)(parse_instruction)

router.post(
    "/submit",
    response_model=EditedImageResponse,
    status_code=status.HTTP_200_OK
)(edit_image)

@router.post("/{tree_id}/root")
async def upload_root_image(
    tree_id: str,
    request: RootImageRequest
):
    # The root node represents the original image for a tree.
    # It is stored as an image node and then linked back to the tree document.
    if not ObjectId.is_valid(tree_id):
        raise HTTPException(status_code=400, detail="Invalid Tree ID format")

    node = ImageNode(
        tree_id=tree_id,
        parent_id=None,
        image_path=request.image_path,
        edit=ParsedInstructionResponse(
            tree_id=tree_id,
            category="Original",
            operation="Original",
            image_path=request.image_path
        ),
        status="Completed"
    )

    result = await image_collection.insert_one(
        node.model_dump(by_alias=True, exclude_none=True)
    )

    await tree_collection.update_one(
        {
            "_id": ObjectId(tree_id)
        },
        {
            "$set": {
                "root_node_id": str(result.inserted_id)
            }
        }
    )

    return {
        "node_id": str(result.inserted_id)
    }

@router.post("/{tree_id}/{image_id}", response_model=ImageNode)
async def upload_child_image(
    tree_id: str,
    image_id: str,
    file: UploadFile = File(...)
):
    # Manual upload flow:
    # validate the tree, confirm the parent node exists, persist the file,
    # and create a new child node that points at the saved image path.
    await validate_tree(tree_id)
    
    await get_image(image_id)
    
    saved_path = await save_uploaded_image(file, tree_id, image_id)
    
    node = await create_child_node(
        tree_id=tree_id,
        parent_id=image_id,
        image_path=saved_path,
        instruction=f"Upload file: {file.filename}",
        explanation="Manually uploaded child image node."
    )
    
    return node

@router.post("/{tree_id}/{image_id}/edit", response_model=ImageNode)
async def edit_child_image(
    tree_id: str,
    image_id: str,
    request: EditImageRequest,
    editor: ImageEditorInterface = Depends(get_image_editor)
):
    # Editing flow:
    # validate the tree, load the source node, verify the file exists locally,
    # send the image to the editor service, then store the generated output as
    # a new child node so the tree preserves the edit history.
    await validate_tree(tree_id)
    
    source_node = await get_image(image_id)
    source_path = source_node.get("image_path")
    if not source_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source image node does not specify an image path."
        )
        
    load_image(source_path)
    
    edit_result = await editor.edit(
        image_path=source_path,
        instruction=request.instruction,
        tree_id=tree_id
    )
    
    load_image(edit_result.output_image_path)
    
    new_node = await create_child_node(
        tree_id=tree_id,
        parent_id=image_id,
        image_path=edit_result.output_image_path,
        instruction=request.instruction,
        explanation=edit_result.explanation
    )
    
    return new_node

