from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.pyobjectid import PyObjectId

class InstructionRequest(BaseModel):
    tree_id: PyObjectId
    image_path: str
    user_instruction: str

class ParsedInstructionResponse(BaseModel):
    tree_id: PyObjectId
    category: str = Field(
        ..., 
        description="Must be exactly 'Tone & Colour' or 'Background Removal'."
    )
    operation: str
    image_path: str

class EditedImageResponse(BaseModel):
    tree_id: PyObjectId
    image_path: str
    explaination: str

class ImageNode(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    tree_id: PyObjectId
    parent_id: Optional[str] = None
    image_path: str          
    edit: ParsedInstructionResponse
    status: str = Field(..., description="Pending, Completed, Failed")
    image_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class RootImageRequest(BaseModel):
    image_path: str

class ChildImageRequest(BaseModel):
    image_path: str

class EditImageRequest(BaseModel):
    instruction: str
