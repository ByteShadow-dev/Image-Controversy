"""
image_editor.py
===============
Modular image-editing pipeline.

Architecture
------------
1. EditProcessor (ABC) – one-method interface every edit type must implement.
2. Concrete processors  – BackgroundRemovalProcessor, etc.  Each lives in its
   own class so new edit types are added without touching routing logic.
3. PROCESSOR_REGISTRY   – maps Groq-classified category strings to processor
   instances.  Adding a new edit type = new class + one dict entry here.
4. PipelineImageEditor  – the public editor that:
     a. calls parse_instruction (Groq) to classify the prompt
     b. looks up the right processor in the registry
     c. runs the processor and returns an EditResult
"""

from __future__ import annotations

import os
import time
from abc import ABC, abstractmethod
from typing import Optional

from fastapi import HTTPException
from pydantic import BaseModel

from app.models.image import InstructionRequest, ParsedInstructionResponse
from app.services.background_removal import remove_background
from app.services.style_transfer import apply_style_transfer


# ---------------------------------------------------------------------------
# Data contract returned by every processor / editor
# ---------------------------------------------------------------------------

class EditResult(BaseModel):
    output_image_path: str
    explanation: str
    category: str


# ---------------------------------------------------------------------------
# Abstract base for all edit processors
# ---------------------------------------------------------------------------

class EditProcessor(ABC):
    """
    Minimal interface that every edit-type processor must satisfy.

    Parameters
    ----------
    image_path : str
        Absolute path to the source image on disk.
    operation : str
        Human-readable description of the operation (from Groq).
    parsed : ParsedInstructionResponse
        Full parsed response, available for processors that need extra fields.

    Returns
    -------
    str
        Absolute path to the output image on disk.
    """

    @abstractmethod
    def process(
        self,
        image_path: str,
        operation: str,
        parsed: Optional[ParsedInstructionResponse] = None,
    ) -> str:
        ...


# ---------------------------------------------------------------------------
# Concrete processors — add new ones here
# ---------------------------------------------------------------------------

class BackgroundRemovalProcessor(EditProcessor):
    """Removes the image background using rembg via background_removal.py."""

    def process(
        self,
        image_path: str,
        operation: str,
        parsed: Optional[ParsedInstructionResponse] = None,
    ) -> str:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_bg_removed_{int(time.time())}.png"
        try:
            remove_background(image_path, output_path)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Background removal failed: {exc}",
            )
        return output_path

class ToneColourProcessor(EditProcessor):
    def process(
        self,
        image_path: str,
        operation: str,
        parsed: Optional[ParsedInstructionResponse] = None,
    ) -> str:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_tone_colour_{operation}_{int(time.time())}.png"
        try:
            apply_style_transfer(image_path, output_path, operation)
                
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Style Transfer failed: {exc}",
            )
        return output_path
    
# ---------------------------------------------------------------------------
# Registry — maps category strings → processor instances
# To add a new edit type:
#   1. Write a new EditProcessor subclass above.
#   2. Add one line here.  Nothing else changes.
# ---------------------------------------------------------------------------

PROCESSOR_REGISTRY: dict[str, EditProcessor] = {
    "Background Removal": BackgroundRemovalProcessor(),
    "Tone & Colour": ToneColourProcessor(),
}


# ---------------------------------------------------------------------------
# Public editor interface (kept for dependency-injection in the API layer)
# ---------------------------------------------------------------------------

class ImageEditorInterface(ABC):
    @abstractmethod
    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        """
        Processes the image at image_path with the given instruction.
        Returns EditResult containing the edited image's path and an explanation.
        """
        ...


# ---------------------------------------------------------------------------
# Pipeline editor — the default implementation used in production
# ---------------------------------------------------------------------------

class PipelineImageEditor(ImageEditorInterface):
    """
    Routes the user prompt through:
      Groq classification → PROCESSOR_REGISTRY dispatch → EditProcessor.process
    """

    async def edit(self, image_path: str, instruction: str, tree_id: str) -> EditResult:
        # 1. Classify the instruction with Groq
        from app.services.groq_service import parse_instruction  # local import avoids circular refs

        payload = InstructionRequest(
            tree_id=tree_id,
            image_path=image_path,
            user_instruction=instruction,
        )
        parsed: ParsedInstructionResponse = await parse_instruction(payload)

        # 2. Look up the right processor
        processor = PROCESSOR_REGISTRY.get(parsed.category)
        if processor is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Unsupported edit category '{parsed.category}'. "
                    f"Supported: {list(PROCESSOR_REGISTRY.keys())}"
                ),
            )

        # 3. Run the processor
        output_path = processor.process(
            image_path=image_path,
            operation=parsed.operation,
            parsed=parsed,
        )

        return EditResult(
            output_image_path=output_path,
            explanation=f"{parsed.category}: {parsed.operation}",
            category=parsed.category,
        )
