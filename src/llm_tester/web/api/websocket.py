"""
WebSocket handling for real-time test progress.

This module provides WebSocket endpoints for streaming test progress
and results to connected clients.
"""

import asyncio
import json
from datetime import datetime
from typing import Any, Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from llm_tester.core.engine import TestEngine
from llm_tester.core.models import (
    TestConfig,
    TestType,
)

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    """Manages WebSocket connections for test progress streaming."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, test_id: str, websocket: WebSocket) -> None:
        """
        Accept and register a new WebSocket connection.

        Args:
            test_id: Test identifier for this connection
            websocket: WebSocket connection instance
        """
        await websocket.accept()
        if test_id not in self.active_connections:
            self.active_connections[test_id] = set()
        self.active_connections[test_id].add(websocket)

    def disconnect(self, test_id: str, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection.

        Args:
            test_id: Test identifier
            websocket: WebSocket connection to remove
        """
        if test_id in self.active_connections:
            self.active_connections[test_id].discard(websocket)
            if not self.active_connections[test_id]:
                del self.active_connections[test_id]

    async def broadcast(self, test_id: str, message: Dict[str, Any]) -> None:
        """
        Broadcast message to all connections for a test.

        Args:
            test_id: Test identifier
            message: Message to broadcast
        """
        if test_id not in self.active_connections:
            return

        dead_connections = set()
        for connection in self.active_connections[test_id]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(test_id, conn)


# Global connection manager
manager = ConnectionManager()


@router.websocket("/ws/test/{test_id}")
async def websocket_test_progress(websocket: WebSocket, test_id: str) -> None:
    """
    WebSocket endpoint for streaming test progress.

    Provides real-time updates on test execution including:
    - Progress updates for each provider/model being tested
    - Individual test results as they complete
    - Final summary when all tests complete

    Args:
        websocket: WebSocket connection
        test_id: Unique identifier for the test session
    """
    await manager.connect(test_id, websocket)

    try:
        # Send initial connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "data": {"test_id": test_id, "timestamp": datetime.now().isoformat()},
            }
        )

        # Wait for test parameters from client
        params_text = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
        params = json.loads(params_text)

        # Execute test with progress updates
        await _execute_test_with_progress(test_id, websocket, params)

    except WebSocketDisconnect:
        manager.disconnect(test_id, websocket)
    except asyncio.TimeoutError:
        await websocket.send_json(
            {
                "type": "error",
                "data": {"message": "Connection timeout - no parameters received"},
            }
        )
        manager.disconnect(test_id, websocket)
    except Exception as e:
        await websocket.send_json(
            {
                "type": "error",
                "data": {"message": f"Unexpected error: {str(e)}"},
            }
        )
        manager.disconnect(test_id, websocket)


async def _execute_test_with_progress(
    test_id: str,
    websocket: WebSocket,
    params: Dict[str, Any],
) -> None:
    """
    Execute test and stream progress updates.

    Args:
        test_id: Test identifier
        websocket: WebSocket connection for progress updates
        params: Test parameters from client
    """
    test_type_str = params.get("test_type", "connectivity")
    provider_str = params.get("provider")
    model = params.get("model")

    # Parse test type
    try:
        test_type = TestType(test_type_str)
    except ValueError:
        await websocket.send_json(
            {
                "type": "error",
                "data": {"message": f"Invalid test type: {test_type_str}"},
            }
        )
        return

    # Parse provider if specified
    provider_type = provider_str.lower() if provider_str else None

    # Create test config
    test_config = TestConfig(
        test_type=test_type,
        provider=provider_type,
        model=model,
        iterations=params.get("iterations", 1),
        max_tokens=params.get("max_tokens", 100),
        prompt=params.get("prompt"),
        context_size=params.get("context_size", 4096),
    )

    # Notify test started
    await websocket.send_json(
        {
            "type": "started",
            "data": {
                "test_id": test_id,
                "test_type": test_type.value,
                "timestamp": datetime.now().isoformat(),
            },
        }
    )

    # Execute test
    engine = TestEngine()
    all_results = []

    try:
        # Get providers to test
        providers_to_test = engine._get_providers_to_test(test_config)

        # Calculate total tests (need to initialize providers first)
        total_tests = 0
        for p, c in providers_to_test.items():
            provider = await engine.initialize_provider(p, c)
            models = engine._get_models_to_test(test_config, provider)
            total_tests += len(models)

        if total_tests == 0:
            await websocket.send_json(
                {
                    "type": "error",
                    "data": {"message": "No providers configured for testing"},
                }
            )
            return

        completed = 0

        for provider_type_item, provider_config in providers_to_test.items():
            provider = await engine.initialize_provider(provider_type_item, provider_config)
            models = engine._get_models_to_test(test_config, provider)

            for model_item in models:
                # Send progress update
                completed += 1
                await websocket.send_json(
                    {
                        "type": "progress",
                        "data": {
                            "provider": provider_type_item,
                            "model": model_item,
                            "status": "running",
                            "progress": int(completed / total_tests * 100),
                            "message": f"Testing {model_item}...",
                        },
                    }
                )

                # Execute test based on type
                try:
                    if test_type == TestType.CONNECTIVITY:
                        result = await provider.test_connectivity(model_item)
                    elif test_type == TestType.PERFORMANCE:
                        prompt = test_config.prompt or "Write a short greeting."
                        result = await provider.test_performance(
                            model_item, prompt, test_config.max_tokens
                        )
                    elif test_type == TestType.CONTEXT:
                        result = await provider.test_context(model_item, test_config.context_size)
                    else:
                        continue

                    result_dict = result.model_dump()
                    all_results.append(result_dict)

                    # Send individual result
                    await websocket.send_json(
                        {
                            "type": "result",
                            "data": {
                                "provider": provider_type_item,
                                "model": model_item,
                                "status": result_dict.get("status"),
                                "result": result_dict,
                            },
                        }
                    )

                except Exception as e:
                    error_result = {
                        "provider": provider_type_item,
                        "model": model_item,
                        "status": "error",
                        "error_message": str(e),
                    }
                    all_results.append(error_result)

                    await websocket.send_json(
                        {
                            "type": "result",
                            "data": error_result,
                        }
                    )

        # Generate summary
        passed = sum(1 for r in all_results if r.get("status") == "passed")
        failed = sum(1 for r in all_results if r.get("status") == "failed")
        errors = sum(1 for r in all_results if r.get("status") == "error")

        # Send completion message
        await websocket.send_json(
            {
                "type": "complete",
                "data": {
                    "test_id": test_id,
                    "summary": {
                        "total": len(all_results),
                        "passed": passed,
                        "failed": failed,
                        "errors": errors,
                        "success_rate": (
                            round(passed / len(all_results) * 100, 1) if all_results else 0
                        ),
                    },
                    "results": all_results,
                    "timestamp": datetime.now().isoformat(),
                },
            }
        )

    except Exception as e:
        await websocket.send_json(
            {
                "type": "error",
                "data": {"message": f"Test execution error: {str(e)}"},
            }
        )
    finally:
        await engine.close()
