from pydantic import BaseModel, ConfigDict, Field


class LLMQueryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    prompt: str = Field(..., min_length=1)
    model: str = Field(default="llama2", min_length=1)
    user_id: str | None = None
    gpu_id: int | None = None
    max_tokens: int = Field(default=512, ge=1, le=1_000_000)
    temperature: float = Field(default=0.7, ge=0, le=2)


class LLMQueryResponseBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    response: str = ""
