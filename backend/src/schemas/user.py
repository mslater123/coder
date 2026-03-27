from pydantic import BaseModel, ConfigDict, Field


class UserUpdateRequest(BaseModel):
    """``PUT /api/users/<id>`` — partial profile / admin fields."""

    model_config = ConfigDict(extra="ignore")

    email: str | None = None
    name: str | None = None
    address: str | None = None
    profile_image: str | None = None
    is_active: bool | None = None
    is_admin: bool | None = None


class UserSettingsPatchRequest(BaseModel):
    """Partial user settings payload (matches keys used in user_routes)."""

    model_config = ConfigDict(extra="ignore")

    editor_theme: str | None = None
    editor_font_size: int | None = Field(None, ge=8, le=72)
    editor_font_family: str | None = None
    editor_tab_size: int | None = Field(None, ge=1, le=16)
    editor_word_wrap: str | None = None
    editor_minimap: bool | None = None
    editor_line_numbers: str | None = None
    ai_default_model: str | None = None
    ai_temperature: float | None = Field(None, ge=0, le=2)
    ai_max_tokens: int | None = Field(None, ge=1, le=1_000_000)
    ai_auto_apply: bool | None = None
    selected_agent_id: int | None = None
    git_use_git: bool | None = None
    git_repo_path: str | None = None
    git_repo_url: str | None = None
    git_auto_commit: bool | None = None
    use_file_system: bool | None = None
    additional_settings: dict | None = None
