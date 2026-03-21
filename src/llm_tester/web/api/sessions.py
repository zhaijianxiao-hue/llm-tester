"""
Session API routes for managing chat sessions.

Provides CRUD operations for sessions and messages.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

from llm_tester.web.session_db import get_db

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("")
async def list_sessions(limit: int = 50, offset: int = 0) -> Dict[str, Any]:
    """List all chat sessions."""
    db = get_db()
    sessions = db.list_sessions(limit=limit, offset=offset)
    total = db.get_session_count()

    return {
        "sessions": sessions,
        "total": total,
    }


@router.post("")
async def create_session(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new chat session."""
    db = get_db()

    session = db.create_session(
        provider=data.get("provider", ""),
        model=data.get("model", ""),
        temperature=data.get("temperature", 0.7),
    )

    return session


@router.get("/{session_id}")
async def get_session(session_id: str) -> Dict[str, Any]:
    """Get a session with its messages."""
    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.get_messages(session_id)
    session["messages"] = messages

    return session


@router.put("/{session_id}")
async def update_session(session_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update a session."""
    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    updated = db.update_session(
        session_id,
        title=data.get("title"),
        provider=data.get("provider"),
        model=data.get("model"),
        temperature=data.get("temperature"),
        auto_title=data.get("auto_title"),
    )

    return updated


@router.delete("/{session_id}")
async def delete_session(session_id: str) -> Dict[str, Any]:
    """Delete a session and its messages."""
    db = get_db()

    deleted = db.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"status": "deleted", "session_id": session_id}


@router.post("/{session_id}/messages")
async def add_message(session_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Add a message to a session."""
    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    message = db.add_message(
        session_id=session_id,
        role=data.get("role", "user"),
        content=data.get("content", ""),
        status=data.get("status", "success"),
        metrics=data.get("metrics"),
    )

    # Auto-title logic: if first user message, set truncated title
    if data.get("role") == "user" and session.get("title") == "New Chat":
        content = data.get("content", "")
        if content:
            truncated = content[:50] + ("..." if len(content) > 50 else "")
            db.update_session(session_id, title=truncated, auto_title=True)

    return message


@router.get("/{session_id}/messages")
async def get_messages(session_id: str) -> List[Dict[str, Any]]:
    """Get all messages for a session."""
    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    return db.get_messages(session_id)


@router.delete("/{session_id}/messages")
async def clear_messages(session_id: str) -> Dict[str, Any]:
    """Clear all messages in a session."""
    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    count = db.delete_messages(session_id)

    return {"status": "cleared", "deleted_count": count}


@router.post("/{session_id}/generate-title")
async def generate_title(session_id: str) -> Dict[str, Any]:
    """
    Generate an AI-powered title for a session.

    Uses the configured provider to summarize the conversation.
    """
    import httpx
    import json

    db = get_db()

    session = db.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = db.get_messages(session_id)
    if not messages:
        return {"title": session.get("title", "New Chat")}

    # Build conversation summary
    conversation = "\n".join([f"{m['role']}: {m['content'][:200]}" for m in messages[:6]])

    prompt = f"""Summarize this conversation in 3-5 words. Only output the title, nothing else.

Conversation:
{conversation}

Title:"""

    # Try to generate title using configured provider
    try:
        from llm_tester.core.config import get_config

        config = get_config()

        # Find a configured provider
        provider_name = session.get("provider") or "changyou"
        provider_config = config.providers.get_provider(provider_name)

        if not provider_config or not provider_config.api_key:
            return {"title": session.get("title", "New Chat")}

        base_url = provider_config.base_url or "https://api.openai.com/v1"

        async with httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {provider_config.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        ) as client:
            response = await client.post(
                "/chat/completions",
                json={
                    "model": session.get("model") or provider_config.models[0]
                    if provider_config.models
                    else "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 20,
                },
            )

            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                if content:
                    # Clean up the title
                    title = content.strip().strip('"').strip("'")[:50]
                    db.update_session(session_id, title=title, auto_title=True)
                    return {"title": title}

    except Exception as e:
        print(f"Error generating title: {e}")

    return {"title": session.get("title", "New Chat")}


@router.get("/search/{query}")
async def search_sessions(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search sessions by title."""
    db = get_db()
    return db.search_sessions(query, limit=limit)
