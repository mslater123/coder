from pydantic import BaseModel, ConfigDict, Field


class DesignDocCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    title: str = Field(default="Untitled Document", max_length=500)
    content: str = ""
    projectId: str | None = None
    project_id: str | None = None
    tags: list[str] | str | None = None
    user_id: str | None = None


class DesignDocUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    title: str | None = Field(None, max_length=500)
    content: str | None = None
    projectId: str | None = None
    project_id: str | None = None
    tags: list[str] | str | None = None
