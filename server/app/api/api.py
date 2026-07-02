from pydantic import BaseModel
from typing import Optional

class CreateProjectPayload(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    genre: Optional[str] = ""
    brief: str = ""

class AssetUploadPayload(BaseModel):
    name: str
    type: str
    content: str
