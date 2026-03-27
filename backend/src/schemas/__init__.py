"""
Pydantic request/response shapes for the Coder API.

Use :func:`src.schemas.common.parse_json` in route handlers when you want strict validation::

    from src.schemas.common import parse_json
    from src.schemas.auth import RegisterRequest

    body, err = parse_json(request, RegisterRequest)
    if err:
        return err
    # body.username, body.password, ...
"""

from src.schemas.auth import LoginRequest, RegisterRequest
from src.schemas.common import parse_json
from src.schemas.design_doc import DesignDocCreateRequest, DesignDocUpdateRequest
from src.schemas.gpu import (
    GPUAssignTaskRequest,
    GPUClientInfo,
    GPUDetectRequest,
    GPUStatusUpdateRequest,
    GPUTaskProgressRequest,
)
from src.schemas.legacy import (
    PriceCreateRequest,
    TransactionCreateRequest,
    WalletCreateRequest,
    WalletUpdateRequest,
)
from src.schemas.llm import LLMQueryRequest, LLMQueryResponseBody
from src.schemas.llm_manager import ModelInstallRequest, ModelRemoveRequest
from src.schemas.project import ProjectCreateRequest, ProjectUpdateRequest
from src.schemas.user import UserSettingsPatchRequest, UserUpdateRequest

__all__ = [
    "parse_json",
    "RegisterRequest",
    "LoginRequest",
    "UserUpdateRequest",
    "UserSettingsPatchRequest",
    "ProjectCreateRequest",
    "ProjectUpdateRequest",
    "GPUClientInfo",
    "GPUDetectRequest",
    "GPUAssignTaskRequest",
    "GPUStatusUpdateRequest",
    "GPUTaskProgressRequest",
    "LLMQueryRequest",
    "LLMQueryResponseBody",
    "ModelInstallRequest",
    "ModelRemoveRequest",
    "DesignDocCreateRequest",
    "DesignDocUpdateRequest",
    "PriceCreateRequest",
    "WalletCreateRequest",
    "WalletUpdateRequest",
    "TransactionCreateRequest",
]
