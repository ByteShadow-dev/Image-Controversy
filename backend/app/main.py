from fastapi import FastAPI
from app.api.endpoints.trees import router as trees_router
from app.api.endpoints.images import router as images_router

app = FastAPI(title="Image Controversy API", version="1.0.0")

app.include_router(trees_router)
app.include_router(images_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", port=8000, reload=True)
