@echo off
cd /d "%~dp0"
.venv\Scripts\python -m uvicorn api.main:app --reload --port 8000
