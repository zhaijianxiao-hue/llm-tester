@echo off
echo Starting LLM Tester Web UI...
echo.
echo Starting Backend Server (port 8000)...
start "LLM Tester Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe -m uvicorn llm_tester.web.app:app --reload --port 8000"
echo.
echo Waiting for backend to start...
timeout /t 3 /nobreak > nul
echo.
echo Starting Frontend Dev Server (port 5173)...
start "LLM Tester Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo.
echo ========================================
echo LLM Tester Web UI is starting!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/api/docs
echo.
echo Press any key to open the Web UI...
pause > nul
start http://localhost:5173