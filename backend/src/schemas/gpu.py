from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

TaskType = Literal["ai_training", "ai_inference", "system_task", "ollama_llm", "install_model"]


class GPUClientInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")

    device_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    vendor: str | None = None
    memory_total: int | None = None
    memory_used: int | None = None
    memory_free: int | None = None
    driver_version: str | None = None
    temperature: int | None = None
    power_usage: float | None = None
    utilization: float | None = None


class GPUDetectRequest(BaseModel):
    """``POST /api/gpus/detect`` — optional client-reported GPUs."""

    model_config = ConfigDict(extra="ignore")

    gpus: list[GPUClientInfo] = Field(default_factory=list)
    host_system: str | None = None


class GPUAssignTaskRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    task_type: TaskType
    task_name: str | None = None
    user_id: str | None = None
    config: dict[str, Any] | str | None = None


class GPUStatusUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    memory_used: int | None = None
    memory_free: int | None = None
    temperature: int | None = None
    power_usage: float | None = None
    utilization: float | None = None


class GPUTaskProgressRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    progress: float = Field(..., ge=0, le=100)
    error_message: str | None = None
    metadata: dict[str, Any] | str | None = None
