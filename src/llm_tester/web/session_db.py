"""
Session and message storage using SQLite.

Provides persistent storage for chat sessions and messages.
"""

import json
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class SessionDatabase:
    """SQLite database manager for chat sessions."""

    def __init__(self, db_path: Optional[Path] = None):
        if db_path is None:
            db_path = Path.home() / ".llm-tester" / "sessions.db"

        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    auto_title INTEGER DEFAULT 0,
                    provider TEXT,
                    model TEXT,
                    temperature REAL DEFAULT 0.7,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT,
                    status TEXT,
                    metrics TEXT,
                    created_at TEXT,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_messages_session 
                ON messages(session_id)
            """)

            conn.commit()

    # Session CRUD

    def create_session(
        self,
        provider: str = "",
        model: str = "",
        temperature: float = 0.7,
    ) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO sessions (id, title, provider, model, temperature, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (session_id, "New Chat", provider, model, temperature, now, now),
            )
            conn.commit()

        return self.get_session(session_id)

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()

            if row is None:
                return None

            return dict(row)

    def list_sessions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM sessions 
                ORDER BY updated_at DESC 
                LIMIT ? OFFSET ?
            """,
                (limit, offset),
            ).fetchall()

            return [dict(row) for row in rows]

    def update_session(
        self,
        session_id: str,
        title: Optional[str] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        auto_title: Optional[bool] = None,
    ) -> Optional[Dict[str, Any]]:
        updates = []
        params = []

        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if provider is not None:
            updates.append("provider = ?")
            params.append(provider)
        if model is not None:
            updates.append("model = ?")
            params.append(model)
        if temperature is not None:
            updates.append("temperature = ?")
            params.append(temperature)
        if auto_title is not None:
            updates.append("auto_title = ?")
            params.append(1 if auto_title else 0)

        if not updates:
            return self.get_session(session_id)

        updates.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(session_id)

        with self._get_conn() as conn:
            conn.execute(f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?", params)
            conn.commit()

        return self.get_session(session_id)

    def delete_session(self, session_id: str) -> bool:
        with self._get_conn() as conn:
            cursor = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()
            return cursor.rowcount > 0

    def search_sessions(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM sessions 
                WHERE title LIKE ? 
                ORDER BY updated_at DESC 
                LIMIT ?
            """,
                (f"%{query}%", limit),
            ).fetchall()

            return [dict(row) for row in rows]

    # Message CRUD

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        status: str = "success",
        metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        message_id = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        metrics_json = json.dumps(metrics) if metrics else None

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, session_id, role, content, status, metrics, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (message_id, session_id, role, content, status, metrics_json, now),
            )

            conn.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
            conn.commit()

        return {
            "id": message_id,
            "session_id": session_id,
            "role": role,
            "content": content,
            "status": status,
            "metrics": metrics,
            "created_at": now,
        }

    def get_messages(self, session_id: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT * FROM messages 
                WHERE session_id = ? 
                ORDER BY created_at ASC
            """,
                (session_id,),
            ).fetchall()

            messages = []
            for row in rows:
                msg = dict(row)
                if msg["metrics"]:
                    msg["metrics"] = json.loads(msg["metrics"])
                messages.append(msg)

            return messages

    def delete_messages(self, session_id: str) -> int:
        with self._get_conn() as conn:
            cursor = conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            conn.commit()
            return cursor.rowcount

    # Stats

    def get_session_count(self) -> int:
        with self._get_conn() as conn:
            return conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]

    def get_message_count(self, session_id: str) -> int:
        with self._get_conn() as conn:
            return conn.execute(
                "SELECT COUNT(*) FROM messages WHERE session_id = ?", (session_id,)
            ).fetchone()[0]


# Global instance
_db: Optional[SessionDatabase] = None


def get_db() -> SessionDatabase:
    global _db
    if _db is None:
        _db = SessionDatabase()
    return _db
