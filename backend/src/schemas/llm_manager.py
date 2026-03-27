from pydantic import BaseModel, ConfigDict, model_validator


class ModelInstallRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gpu_id: int | None = None
    client_host: str | None = None

    @model_validator(mode="after")
    def require_target(self):
        if self.gpu_id is None and not (self.client_host and self.client_host.strip()):
            raise ValueError("gpu_id or client_host is required")
        return self


class ModelRemoveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gpu_id: int | None = None
    client_host: str | None = None

    @model_validator(mode="after")
    def require_target(self):
        if self.gpu_id is None and not (self.client_host and self.client_host.strip()):
            raise ValueError("gpu_id or client_host is required")
        return self
