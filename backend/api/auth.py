from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import RedirectResponse
from jwt import InvalidTokenError

from auth.security import create_token, decode_token, hash_password, new_id, new_state, verify_password
from auth.store import (
    consume_oauth_state,
    create_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_provider,
    init_db,
    link_provider,
    save_oauth_state,
)
from config import settings
from models.user import AuthResponse, AuthUser, LoginRequest, ProviderStatus, SignupRequest

router = APIRouter(prefix="/api/auth", tags=["Auth"])

init_db()


def public_user(user: dict) -> AuthUser:
    return AuthUser(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        providers=user["providers"],
    )


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    user = get_user_by_id(payload.get("sub", ""))
    if not user:
        raise HTTPException(status_code=401, detail="Account not found.")
    return user


def optional_user(authorization: str | None = Header(default=None)) -> dict | None:
    if not authorization:
        return None
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None


@router.get("/providers", response_model=ProviderStatus)
def providers():
    return ProviderStatus(
        google=bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
        github=bool(settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET),
    )


@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest):
    email = body.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    user = create_user(
        user_id=new_id(),
        email=email,
        name=body.name or email.split("@")[0],
        password_hash=hash_password(body.password),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    token = create_token(user["id"], user["email"])
    return AuthResponse(token=token, user=public_user(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest):
    email = body.email.strip().lower()
    user = get_user_by_email(email)
    if not user or not user["password_hash"] or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    token = create_token(user["id"], user["email"])
    return AuthResponse(token=token, user=public_user(user))


@router.get("/me", response_model=AuthUser)
def me(user: dict = Depends(get_current_user)):
    return public_user(user)


def _frontend_redirect(token: str | None = None, error: str | None = None) -> RedirectResponse:
    params = {}
    if token:
        params["token"] = token
    if error:
        params["error"] = error
    url = f"{settings.FRONTEND_URL}/auth/callback"
    if params:
        url = f"{url}?{urlencode(params)}"
    return RedirectResponse(url)


def _upsert_oauth_user(email: str, name: str, provider: str, provider_id: str) -> dict:
    email = email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail=f"{provider} did not return an email address.")
    existing = get_user_by_provider(provider, provider_id) or get_user_by_email(email)
    if existing:
        return link_provider(existing["id"], provider, provider_id, name)
    return create_user(
        user_id=new_id(),
        email=email,
        name=name or email.split("@")[0],
        google_id=provider_id if provider == "google" else None,
        github_id=provider_id if provider == "github" else None,
        created_at=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/google")
def google_start(intent: str = "login"):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    state = new_state()
    save_oauth_state(state, intent, datetime.now(timezone.utc).isoformat())
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        return _frontend_redirect(error="Google sign-in was cancelled.")
    if not code or not state or not consume_oauth_state(state):
        return _frontend_redirect(error="Google sign-in could not be verified.")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            token_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json().get("access_token")
            info = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            info.raise_for_status()
            profile = info.json()
        user = _upsert_oauth_user(
            email=profile.get("email", ""),
            name=profile.get("name", ""),
            provider="google",
            provider_id=str(profile.get("sub")),
        )
        return _frontend_redirect(token=create_token(user["id"], user["email"]))
    except HTTPException:
        raise
    except Exception:
        return _frontend_redirect(error="Google sign-in failed. Check API credentials.")


@router.get("/github")
def github_start(intent: str = "login"):
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub sign-in is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.")
    state = new_state()
    save_oauth_state(state, intent, datetime.now(timezone.utc).isoformat())
    params = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.github_redirect_uri,
        "scope": "user:email",
        "state": state,
        "allow_signup": "true",
    })
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback")
async def github_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        return _frontend_redirect(error="GitHub sign-in was cancelled.")
    if not code or not state or not consume_oauth_state(state):
        return _frontend_redirect(error="GitHub sign-in could not be verified.")
    try:
        async with httpx.AsyncClient(timeout=20, headers={"Accept": "application/json"}) as client:
            token_res = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.github_redirect_uri,
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json().get("access_token")
            headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
            profile_res = await client.get("https://api.github.com/user", headers=headers)
            profile_res.raise_for_status()
            profile = profile_res.json()
            emails_res = await client.get("https://api.github.com/user/emails", headers=headers)
            emails_res.raise_for_status()
            emails = emails_res.json()
        email = ""
        for item in emails:
            if item.get("primary") and item.get("verified"):
                email = item.get("email", "")
                break
        if not email and emails:
            email = emails[0].get("email", "")
        user = _upsert_oauth_user(
            email=email or (profile.get("email") or ""),
            name=profile.get("name") or profile.get("login") or "",
            provider="github",
            provider_id=str(profile.get("id")),
        )
        return _frontend_redirect(token=create_token(user["id"], user["email"]))
    except HTTPException:
        raise
    except Exception:
        return _frontend_redirect(error="GitHub sign-in failed. Check API credentials.")
