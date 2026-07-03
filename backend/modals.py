from pydantic import BaseModel, Field

# Request payload schema
class InstructionRequest(BaseModel):
    image_path : str = Field(
        ...,
        description="Image path"
    )
    user_instruction: str = Field(
        ..., 
        description="The raw editing text command from the user."
    )
    
# Strict response payload schema based on your image table
class ParsedInstructionResponse(BaseModel):
    category: str = Field(
        ..., 
        description="Must be exactly 'Tone & Colour' or 'Background Removal'."
    )
    operation: str = Field(
        ..., 
        description="The specific extracted action (e.g., 'Warm image', 'Remove background', 'Isolate subject')."
    )
    image_path: str = Field(...)
    
class EditedImageResponse(BaseModel):
    image_path: str = Field(...)
    explaination: str = Field(...)
