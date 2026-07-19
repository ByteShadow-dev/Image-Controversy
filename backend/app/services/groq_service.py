"""
groq_service.py
===============
Handles communication with the Groq API for instruction classification.

parse_instruction
  Accepts an InstructionRequest, calls the Groq LLM to classify the user's
  prompt into a structured ParsedInstructionResponse (category + operation).
  The actual image processing is delegated to PipelineImageEditor so that
  this module stays single-purpose.
"""

import json
from groq import Groq, GroqError
from fastapi import HTTPException, status
from app.models.image import InstructionRequest, ParsedInstructionResponse
from app.core.database import get_database

image_nodes = get_database("images")

try:
    groq_client = Groq()
except Exception as e:
    raise RuntimeError(f"Failed to initialize Groq Client: {e}")

SYSTEM_PROMPT = """
You are a precise classification API that parses image-editing commands.
Analyze the user's input and classify it based on these strict definitions:

1. Category: "Tone & Colour"
   - Example instructions: "Warm this up", "make it look overcast", "brighten it", "add contrast".
2. Category: "Background Removal"
   - Example instructions: "Remove the background", "isolate the subject", "cut out the person".

You MUST return your response as a valid JSON object matching this schema:
{
  "category": "Tone & Colour" or "Background Removal",
  "operation": "Comma separated actions needed to be taken on the image",
  "explanation": "One short, plain-language sentence stating what will change and why it fulfils the user's request. Do not claim to have inspected the image."
}
"""

async def parse_instruction(payload: InstructionRequest) -> ParsedInstructionResponse:
    """
    Calls the Groq API to classify the user instruction and returns a
    ParsedInstructionResponse with category, operation, image_path, tree_id.
    """
    MODEL_ID = "openai/gpt-oss-20b"

    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Parse this instruction: '{payload.user_instruction}'"}
            ],
            model=MODEL_ID,
            temperature=0.0,           # deterministic classification
            response_format={"type": "json_object"}
        )

        raw_json_output = chat_completion.choices[0].message.content
        data = json.loads(raw_json_output)
        data["image_path"] = payload.image_path
        data["tree_id"] = payload.tree_id
        data["explanation"] = data.get("explanation", "")

        validated_response = ParsedInstructionResponse.model_validate(data)
        return validated_response

    except GroqError as ge:
        if "rate_limit" in str(ge).lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Groq Free Tier rate limit hit. Try again in a moment.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq processing error: {str(ge)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Parser Error: {str(e)}",
        )
