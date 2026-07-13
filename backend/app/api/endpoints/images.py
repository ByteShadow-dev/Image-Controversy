from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from app.core.database import get_database
from app.models.image import (
    InstructionRequest,
    ParsedInstructionResponse,
    EditedImageResponse,
    RootImageRequest,
    ImageNode
)
from app.services.groq_service import parse_instruction, edit_image

router = APIRouter(prefix="/images", tags=["Images"])

tree_collection = get_database("trees")
image_collection = get_database("images")

# Map service functions directly to endpoints
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

