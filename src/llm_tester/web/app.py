"""
FastAPI application for LLM Tester Web UI.

This module provides the main FastAPI application instance,
configures middleware, and mounts API routes.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from llm_tester.web.api.routes import router as api_router
from llm_tester.web.api.websocket import router as ws_router
from llm_tester.web.api.sessions import router as sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.

    Handles startup and shutdown events.
    """
    # Startup
    print("🚀 LLM Tester Web UI starting...")
    yield
    # Shutdown
    print("👋 LLM Tester Web UI shutting down...")


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    app = FastAPI(
        title="LLM Tester",
        description="A comprehensive LLM API testing tool with Web UI",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # Configure CORS for frontend development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",  # Vite dev server
            "http://localhost:3000",  # Alternative dev port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API routers
    app.include_router(api_router, prefix="/api")
    app.include_router(sessions_router, prefix="/api")
    app.include_router(ws_router)

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """Health check endpoint."""
        return {"status": "ok", "version": "0.1.0"}

    # Mount static files for production (if exists)
    static_dir = Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

    return app


# Create application instance
app = create_app()


def run() -> None:
    """
    Run the application using uvicorn.

    This is the entry point for the `llm-tester-web` script.
    """
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        "llm_tester.web.app:app",
        host=host,
        port=port,
        reload=True,
    )


if __name__ == "__main__":
    run()
