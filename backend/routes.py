import os
from fastapi import FastAPI, HTTPException, status, APIRouter
from modals import InstructionRequest, ParsedInstructionResponse, EditedImageResponse
from controllers import parse_instruction, edit_image
from groq import Groq, GroqError
from dotenv import load_dotenv


# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api")


router.post(
    "/parse",
    response_model=ParsedInstructionResponse,
    status_code=status.HTTP_200_OK,
)(parse_instruction)

router.post(
    "/submit", response_model=EditedImageResponse, status_code=status.HTTP_200_OK
)(edit_image)
