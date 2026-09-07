@echo off
REM ==============================================================================
REM Replora FastAPI Voice Agent — Windows Launcher
REM ==============================================================================

cd /d "%~dp0\.."

echo [1/3] Checking environment...
if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env
)

echo [2/3] Installing/verifying dependencies...
where uv >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using uv package manager...
    uv pip install -r agent\requirements.txt
    echo [3/3] Starting FastAPI Agent on port 8000...
    uv run python agent\main.py
) else (
    echo Using standard python...
    pip install -r agent\requirements.txt
    echo [3/3] Starting FastAPI Agent on port 8000...
    python agent\main.py
)
pause
