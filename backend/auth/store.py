import sqlite3
import threading
from pathlib import Path
from typing import Optional

from config import settings

_lock = threading.Lock()


def _db() -> sqlite3.Connection:
    path = Path(settings.AUTH_DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock:
        conn = _db()
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT DEFAULT '',
                password_hash TEXT,
                google_id TEXT,
                github_id TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                intent TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
        conn.close()


def row_to_user(row: sqlite3.Row) -> dict:
    providers = []
    if row["password_hash"]:
        providers.append("password")
    if row["google_id"]:
        providers.append("google")
    if row["github_id"]:
        providers.append("github")
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"] or "",
        "password_hash": row["password_hash"],
        "google_id": row["google_id"],
        "github_id": row["github_id"],
        "providers": providers,
    }


def get_user_by_email(email: str) -> Optional[dict]:
    conn = _db()
    row = conn.execute("SELECT * FROM users WHERE lower(email) = lower(?)", (email,)).fetchone()
    conn.close()
    return row_to_user(row) if row else None


def get_user_by_id(user_id: str) -> Optional[dict]:
    conn = _db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return row_to_user(row) if row else None


def get_user_by_provider(provider: str, provider_id: str) -> Optional[dict]:
    column = "google_id" if provider == "google" else "github_id"
    conn = _db()
    row = conn.execute(f"SELECT * FROM users WHERE {column} = ?", (provider_id,)).fetchone()
    conn.close()
    return row_to_user(row) if row else None


def create_user(
    user_id: str,
    email: str,
    name: str,
    password_hash: Optional[str] = None,
    google_id: Optional[str] = None,
    github_id: Optional[str] = None,
    created_at: str = "",
) -> dict:
    with _lock:
        conn = _db()
        conn.execute(
            """
            INSERT INTO users (id, email, name, password_hash, google_id, github_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, email.lower().strip(), name.strip(), password_hash, google_id, github_id, created_at),
        )
        conn.commit()
        conn.close()
    return get_user_by_id(user_id)


def link_provider(user_id: str, provider: str, provider_id: str, name: Optional[str] = None) -> dict:
    column = "google_id" if provider == "google" else "github_id"
    with _lock:
        conn = _db()
        if name:
            conn.execute(
                f"UPDATE users SET {column} = ?, name = COALESCE(NULLIF(name, ''), ?) WHERE id = ?",
                (provider_id, name, user_id),
            )
        else:
            conn.execute(f"UPDATE users SET {column} = ? WHERE id = ?", (provider_id, user_id))
        conn.commit()
        conn.close()
    return get_user_by_id(user_id)


def save_oauth_state(state: str, intent: str, created_at: str) -> None:
    with _lock:
        conn = _db()
        conn.execute(
            "INSERT INTO oauth_states (state, intent, created_at) VALUES (?, ?, ?)",
            (state, intent, created_at),
        )
        conn.commit()
        conn.close()


def consume_oauth_state(state: str) -> Optional[str]:
    with _lock:
        conn = _db()
        row = conn.execute("SELECT intent FROM oauth_states WHERE state = ?", (state,)).fetchone()
        if row:
            conn.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            conn.commit()
        conn.close()
    return row["intent"] if row else None
