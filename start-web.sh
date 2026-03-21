#!/bin/bash
echo "Starting LLM Tester Web UI..."
echo ""
echo "Starting Backend Server (port 8000)..."
cd "$(dirname "$0")"
.venv/bin/python -m uvicorn llm_tester.web.app:app --reload --port 8000 &
BACKEND_PID=$!
echo ""
echo "Waiting for backend to start..."
sleep 3
echo ""
echo "Starting Frontend Dev Server (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
echo ""
echo "========================================"
echo "LLM Tester Web UI is starting!"
echo "========================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID