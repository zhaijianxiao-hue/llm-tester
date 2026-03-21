"""
Database service for Session and Message management.
Uses SQLite for persistence with async support.
"""

import aiosqlite
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field


# Database path
DB_PATH = Path(__file__).parent.parent.parent.parent.parent / "data" / "sessions.db"


@dataclass
class Session:
    """Session model."""

    id: str
    title: str
    auto_title: bool = False
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "auto_title": self.auto_title,
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class Message:
    """Message model."""

    id: str
    session_id: str
    role: str
    content: str
    metrics: Optional[Dict[str, Any]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "metrics": self.metrics,
            "created_at": self.created_at,
        }


class DatabaseService:
    """Async database service for sessions and messages."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self._db: Optional[aiosqlite.Connection] = None

    async def _get_db(self) -> aiosqlite.Connection:
        """Get or create database connection."""
        if self._db is None:
            # Ensure data directory exists
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            self._db = await aiosqlite.connect(self.db_path)
            self._db.row_factory = aiosqlite.Row
            await self._create_tables()
        return self._db

    async def _create_tables(self):
        """Create database tables if they don't exist."""
        db = await self._get_db()
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                title TEXT,
                auto_title INTEGER DEFAULT 0,
                provider TEXT,
                model TEXT,
                temperature REAL DEFAULT 0.7,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                role TEXT,
                content TEXT,
                metrics JSON,
                created_at TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            );
            
            CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
        """)
        await db.commit()

    async def close(self):
        """Close database connection."""
        if self._db:
            await self._db.close()
            self._db = None

    # ============== Session CRUD ==============

    async def create_session(
        self,
        session_id: str,
        title: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.7,
    ) -> Session:
        """Create a new session."""
        db = await self._get_db()
        now = datetime.now().isoformat()

        await db.execute(
            """
            INSERT INTO sessions (id, title, auto_title, provider, model, temperature, created_at, updated_at)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?)
            """,
            (session_id, title, provider, model, temperature, now, now),
        )
        await db.commit()

        return Session(
            id=session_id,
            title=title,
            auto_title=True,
            provider=provider,
            model=model,
            temperature=temperature,
            created_at=now,
            updated_at=now,
        )

    async def get_session(self, session_id: str) -> Optional[Session]:
        """Get a session by ID."""
        db = await self._get_db()
        async with db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return Session(
                    id=row["id"],
                    title=row["title"],
                    auto_title=bool(row["auto_title"]),
                    provider=row["provider"],
                    model=row["model"],
                    temperature=row["temperature"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
        return None

    async def list_sessions(self, limit: int = 50, offset: int = 0) -> List[Session]:
        """List all sessions ordered by updated_at desc."""
        db = await self._get_db()
        sessions = []
        async with db.execute(
            "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?", (limit, offset)
        ) as cursor:
            async for row in cursor:
                sessions.append(
                    Session(
                        id=row["id"],
                        title=row["title"],
                        auto_title=bool(row["auto_title"]),
                        provider=row["provider"],
                        model=row["model"],
                        temperature=row["temperature"],
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                    )
                )
        return sessions

    async def update_session(
        self,
        session_id: str,
        title: Optional[str] = None,
        auto_title: Optional[bool] = None,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> Optional[Session]:
        """Update a session."""
        db = await self._get_db()
        session = await self.get_session(session_id)
        if not session:
            return None

        # Build update query
        updates = []
        params = []

        if title is not None:
            updates.append("title = ?")
            params.append(title)
        if auto_title is not None:
            updates.append("auto_title = ?")
            params.append(1 if auto_title else 0)
        if provider is not None:
            updates.append("provider = ?")
            params.append(provider)
        if model is not None:
            updates.append("model = ?")
            params.append(model)
        if temperature is not None:
            updates.append("temperature = ?")
            params.append(temperature)

        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(session_id)

            await db.execute(f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?", params)
            await db.commit()

        return await self.get_session(session_id)

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session and all its messages."""
        db = await self._get_db()
        cursor = await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()
        return cursor.rowcount > 0

    async def touch_session(self, session_id: str):
        """Update session's updated_at timestamp."""
        db = await self._get_db()
        await db.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (datetime.now().isoformat(), session_id),
        )
        await db.commit()

    # ============== Message CRUD ==============

    async def add_message(
        self,
        message_id: str,
        session_id: str,
        role: str,
        content: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> Message:
        """Add a message to a session."""
        db = await self._get_db()
        now = datetime.now().isoformat()

        await db.execute(
            """
            INSERT INTO messages (id, session_id, role, content, metrics, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (message_id, session_id, role, content, json.dumps(metrics) if metrics else None, now),
        )
        await db.commit()

        # Update session's updated_at
        await self.touch_session(session_id)

        return Message(
            id=message_id,
            session_id=session_id,
            role=role,
            content=content,
            metrics=metrics,
            created_at=now,
        )

    async def get_messages(self, session_id: str) -> List[Message]:
        """Get all messages for a session ordered by created_at."""
        db = await self._get_db()
        messages = []
        async with db.execute(
            "SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,)
        ) as cursor:
            async for row in cursor:
                messages.append(
                    Message(
                        id=row["id"],
                        session_id=row["session_id"],
                        role=row["role"],
                        content=row["content"],
                        metrics=json.loads(row["metrics"]) if row["metrics"] else None,
                        created_at=row["created_at"],
                    )
                )
        return messages

    async def delete_messages(self, session_id: str) -> int:
        """Delete all messages for a session."""
        db = await self._get_db()
        cursor = await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
        await db.commit()
        return cursor.rowcount


# Global database instance
_db_service: Optional[DatabaseService] = None


async def get_db_service() -> DatabaseService:
    """Get or create the global database service."""
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service
