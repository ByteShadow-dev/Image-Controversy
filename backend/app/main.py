from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api.endpoints.trees import router as trees_router
from app.api.endpoints.images import router as images_router
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Image Controversy API", version="1.0.0")

# Ensure uploads directory exists
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

origins = [
    "http://localhost:3000",  # React
    "http://127.0.0.1:3000",
    "https://your-frontend.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Or ["*"] for all origins (see note below)
    allow_credentials=True,
    allow_methods=["*"],        # GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],        # Allow all headers
)

app.include_router(trees_router, prefix="/api")
app.include_router(images_router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    from app.core.database import get_database
    image_collection = get_database("images")
    await image_collection.create_index("tree_id")
    await image_collection.create_index("parent_id")
    await image_collection.create_index("image_hash")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", port=8000, reload=True)
