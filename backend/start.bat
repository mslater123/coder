@echo off
REM Bitcoin Tracker Backend Startup Script for Windows
REM This script sets up and runs the Flask backend server

setlocal enabledelayedexpansion

echo === Bitcoin Tracker Backend Startup ===
echo.

REM Get the directory where the script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed. Please install Python 3.8 or higher.
    exit /b 1
)

for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYTHON_VERSION=%%v
echo Found Python !PYTHON_VERSION!

REM Virtual environment setup
set "VENV_DIR=venv"

if not exist "%VENV_DIR%" (
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
    echo Virtual environment created
) else (
    echo Virtual environment found
)

REM Activate virtual environment
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip --quiet

REM Install/update dependencies
echo Installing dependencies...
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo Dependencies installed
) else (
    echo Error: requirements.txt not found
    exit /b 1
)

REM Create data directory if it doesn't exist
if not exist "data" mkdir data

REM Set environment variables
set "FLASK_APP=app.py"
if not defined FLASK_DEBUG set "FLASK_DEBUG=False"
if not defined PORT set "PORT=5000"

echo.
echo === Starting Flask Backend Server ===
echo Server will run on: http://localhost:%PORT%
echo API Health Check: http://localhost:%PORT%/api/health
echo.
echo Press Ctrl+C to stop the server
echo.

REM Run the Flask application
python app.py

endlocal
