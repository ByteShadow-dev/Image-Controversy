from modals import InstructionRequest, ParsedInstructionResponse
import os
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from groq import Groq, GroqError
from dotenv import load_dotenv

load_dotenv()

try:
    groq_client = Groq()
except Exception as e:
    raise RuntimeError(f"Failed to initialize Groq Client: {e}")

async def process_instruction(request: InstructionRequest):
    # Access the validated field
    return {"message": f"You sent: {request.user_instruction}"}

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
  "operation": "A brief summary of the exact action being requested"
}
"""

async def parse_instruction(payload: InstructionRequest):
    # Using Llama 3.3 70B via Groq Free Tier
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
        
        # Pydantic parses and validates the JSON string into the required response schema
        validated_response = ParsedInstructionResponse.model_validate_json(raw_json_output)
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