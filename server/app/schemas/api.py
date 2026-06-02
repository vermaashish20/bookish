from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

class SettingsModel(BaseModel):
    plannerModel: Dict[str, Any] = Field(default_factory=dict)
    writerModel: Dict[str, Any] = Field(default_factory=dict)
    factCheckerModel: Dict[str, Any] = Field(default_factory=dict)
    humanizerModel: Dict[str, Any] = Field(default_factory=dict)
    researcherModel: Dict[str, Any] = Field(default_factory=dict)
    editorModel: Dict[str, Any] = Field(default_factory=dict)
    worldBuilderModel: Dict[str, Any] = Field(default_factory=dict)

class CreateProjectPayload(BaseModel):
    title: str
    subtitle: Optional[str] = ""
    genre: Optional[str] = ""
    brief: str
    run_agents: bool = True   # True → invoke planner graph immediately; False → create canvas only

class UpdateSettingsPayload(BaseModel):
    settings: SettingsModel

class AssetUploadPayload(BaseModel):
    name: str
    type: str
    content: str

class PromptSubmitPayload(BaseModel):
    prompt: str

class MessageSubmitPayload(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None  # fallback for backward compatibility

class ResumePayload(BaseModel):
    run_id: str
    response: str
