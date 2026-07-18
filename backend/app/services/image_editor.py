from abc import ABC, abstractmethod
from pydantic import BaseModel
import os
from bson import ObjectId
from app.models.image import InstructionRequest, ParsedInstructionResponse
from app.services.groq_service import parse_instruction
from app.services.background_removal import remove_background
from fastapi import HTTPException

class EditResult(BaseModel):
    output_image_path: str
    explanation: str

class ImageEditorInterface(ABC):
    @abstractmethod
    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        """
        Processes the image at image_path with the given instruction.
        Returns EditResult containing the edited image's path and an explanation.
        """
        pass

class DefaultImageEditor(ImageEditorInterface):
    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        # Wrap in InstructionRequest to reuse existing parse_instruction service
        payload = InstructionRequest(
            tree_id=ObjectId(tree_id) if ObjectId.is_valid(tree_id) else tree_id,
            image_path=image_path,
            user_instruction=instruction
        )
        
        # Parse the user instruction using the Groq Service
        parsed: ParsedInstructionResponse = await parse_instruction(payload)
        
        # Define output path
        base, ext = os.path.splitext(image_path)
        # Ensure the filename is unique or versioned
        import time
        output_filename = f"{base}_edited_{int(time.time())}{ext or '.png'}"
        
        if parsed.category == "Background Removal":
            try:
                remove_background(image_path, output_filename)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to remove background: {str(e)}"
                )
            explanation = "Removed the background from the image as requested."
        elif parsed.category == "Tone & Colour":
            # Simulate or throw 400 as done previously, but let's throw 400 for unsupported category
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported category: {parsed.category}. Tone & Colour adjustments are not implemented yet."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported category: {parsed.category}"
            )
            
        return EditResult(
            output_image_path=output_filename,
            explanation=explanation
        )

from app.services.style_transfer import apply_style_transfer

class EditResult(BaseModel):
    output_image_path: str
    explanation: str
    category: str  # carried through so create_child_node doesn't guess

class DefaultImageEditor(ImageEditorInterface):
    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        payload = InstructionRequest(
            tree_id=ObjectId(tree_id) if ObjectId.is_valid(tree_id) else tree_id,
            image_path=image_path,
            user_instruction=instruction
        )
        parsed: ParsedInstructionResponse = await parse_instruction(payload)

        base, ext = os.path.splitext(image_path)
        import time
        output_filename = f"{base}_edited_{int(time.time())}{ext or '.png'}"

        if parsed.category == "Background Removal":
            try:
                remove_background(image_path, output_filename)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to remove background: {str(e)}")
            explanation = "Removed the background from the image as requested."

        elif parsed.category == "Style Transfer":
            if not parsed.style:
                raise HTTPException(status_code=400, detail="Style Transfer requested but no style was identified.")
            await apply_style_transfer(image_path, output_filename, style=parsed.style)
            explanation = f"Applied '{parsed.style}' style transfer to the image."

        elif parsed.category == "Tone & Colour":
            raise HTTPException(status_code=400, detail="Tone & Colour adjustments are not implemented yet.")

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported category: {parsed.category}")

        return EditResult(
            output_image_path=output_filename,
            explanation=explanation,
            category=parsed.category,
        )