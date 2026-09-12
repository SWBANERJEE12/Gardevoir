from pydantic import BaseModel, Field
from typing import Optional, Literal


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    id: str
    email: str
    name: str
    providers: list[str] = Field(default_factory=list)


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


class ProviderStatus(BaseModel):
    google: bool
    github: bool
