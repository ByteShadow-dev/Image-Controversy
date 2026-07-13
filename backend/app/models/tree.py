from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.models.pyobjectid import PyObjectId
from app.models.image import ImageNode

class CreateTreeRequest(BaseModel):
    title: str

class Tree(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    title: str
    root_node_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class TreeResponse(BaseModel):
    tree: Tree
    nodes: List[ImageNode]
