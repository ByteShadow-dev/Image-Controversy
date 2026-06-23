import os
from fastapi import FastAPI, HTTPException, status
from modals import InstructionRequest, ParsedInstructionResponse
from controllers import process_instruction, parse_instruction
from groq import Groq, GroqError
from dotenv import load_dotenv



# Load environment variables
load_dotenv()

app = FastAPI(
    title="Image Editing Instruction Parser API",
    description="Parses raw user intents into structured categories and operations."
)

app.post("/api/test")(process_instruction)

app.post(
    "/api/parse", 
    response_model=ParsedInstructionResponse,
    status_code=status.HTTP_200_OK,
    summary="Categorize and extract editing operations"
)(parse_instruction)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)