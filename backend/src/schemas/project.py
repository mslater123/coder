from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    name: str = Field(..., min_length=1)
    description: str | None = None
    settings: dict[str, Any] | None = None


class ProjectUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    name: str | None = Field(None, min_length=1)
    description: str | None = None
    settings: dict[str, Any] | None = None
