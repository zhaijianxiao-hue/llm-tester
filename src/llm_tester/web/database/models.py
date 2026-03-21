"""
Database models for Session and Message management.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class Session(BaseModel):
    """Session model for chat conversations."""

    id: str = Field(description="Unique session identifier")
    title: str = Field(default="", description="Session title")
    auto_title: bool = Field(default=False, description="Whether title is auto-generated")
    provider: Optional[str] = Field(default=None, description="Selected provider")
    model: Optional[str] = Field(default=None, description="Selected model")
    temperature: float = Field(default=0.7, description="Temperature setting")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update timestamp")


class Message(BaseModel):
    """Message model for chat messages."""

    id: str = Field(description="Unique message identifier")
    session_id: str = Field(description="Session this message belongs to")
    role: str = Field(description="Message role: user or assistant")
    content: str = Field(description="Message content")
    metrics: Optional[dict] = Field(default=None, description="Performance metrics")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")


class SessionCreate(BaseModel):
    """Request model for creating a session."""

    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: float = 0.7


class SessionUpdate(BaseModel):
    """Request model for updating a session."""

    title: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None


class MessageCreate(BaseModel):
    """Request model for adding a message."""

    role: str
    content: str
    metrics: Optional[dict] = None
