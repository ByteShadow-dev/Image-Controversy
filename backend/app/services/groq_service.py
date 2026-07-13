import json
from groq import Groq, GroqError
from fastapi import HTTPException, status
from app.models.image import InstructionRequest, ParsedInstructionResponse, EditedImageResponse, ImageNode
from app.core.database import get_database
from app.services.background_removal import remove_background

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
  "operation": "Comma separated actions needed to be taken on the image"
}
"""

async def parse_instruction(payload: InstructionRequest):
    MODEL_ID = "openai/gpt-oss-20b"
    
    try:
        # Call Groq API forcing a JSON object return
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Parse this instruction: '{payload.user_instruction}'"}
            ],
            model=MODEL_ID,
            temperature=0.0, # 0.0 makes it deterministic and accurate for classification
            response_format={"type": "json_object"} # Forces JSON structure
        )
        
        # Extracted response string
        raw_json_output = chat_completion.choices[0].message.content
        data = json.loads(raw_json_output)
        data["image_path"] = payload.image_path
        data['tree_id'] = payload.tree_id
        # Pydantic parses and validates the JSON string into the required response schema
        validated_response = ParsedInstructionResponse.model_validate(data)
        return validated_response

    except GroqError as ge:
        if "rate_limit" in str(ge).lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Groq Free Tier rate limit hit. Try again in a moment."
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq processing error: {str(ge)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal Parser Error: {str(e)}"
        )
        
async def edit_image(payload: InstructionRequest):
    parsed: ParsedInstructionResponse = await parse_instruction(payload)
    node = ImageNode(
        tree_id=payload.tree_id,
        parent_id=None,
        image_path=payload.image_path,
        edit=parsed,
        status="Pending"
    )
    if parsed.category == "Background Removal":
        # remove_background(payload.image_path, f"{payload.image_path}_output.png")
        node.status = "Completed"
        node.image_path = f"{payload.image_path}_output.png"
        await image_nodes.insert_one(node.model_dump(by_alias=True, exclude_none=True))
        
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported category: {parsed.category}"
        )  
    return EditedImageResponse(
        tree_id=payload.tree_id,
        image_path=f"{payload.image_path}_output.png",
        explaination=parsed.category,
    )
