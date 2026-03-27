from pydantic import BaseModel, ConfigDict, Field, model_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    email: str | None = None


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    username: str | None = None
    email: str | None = None
    password: str = Field(..., min_length=1)

    @model_validator(mode="after")
    def username_or_email(self):
        if not (self.username or self.email):
            raise ValueError("username or email is required")
        return self
