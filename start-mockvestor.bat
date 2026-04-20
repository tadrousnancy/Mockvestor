@echo off
title Mockvestor Showcase Setup
echo ===================================================
echo Welcome to the Mockvestor Local Showcase!
echo ===================================================
echo.

:: Note: Using 0.0.0.0 tells FastAPI to listen on all local network IP addresses automatically.
echo IMPORTANT PRE-FLIGHT CHECK:
echo 1. Did you paste your .env file into ./server/src/core/ ?
echo 2. Did you update ./mobile/config.ts with your computer's IP address?
echo.
pause

echo.
echo [1/3] Setting up Python Virtual Environment...
if not exist .venv (
    py -3.13 -m venv .venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

echo.
echo [2/3] Launching Backend Server...
:: This opens a new PowerShell window, activates the venv, installs dependencies, and runs FastAPI
start "Mockvestor Backend" powershell -NoExit -Command ".\.venv\Scripts\Activate.ps1; echo 'Installing Python dependencies...'; python -m pip install --upgrade pip; pip install -r .\requirements.txt; cd server; echo 'Starting FastAPI...'; fastapi dev .\main.py --host 0.0.0.0 --port 8080"

echo [3/3] Launching Mobile Frontend...
:: This opens a second PowerShell window, installs node modules, and runs Expo
start "Mockvestor Mobile" powershell -NoExit -Command "cd mobile; echo 'Installing Mobile dependencies...'; npm install; npx expo install; npx expo install expo-secure-store; echo 'Starting Expo Server...'; npx expo start"

echo.
echo ===================================================
echo Launch sequence initiated! 
echo Two new terminal windows have opened.
echo You can safely close this setup window.
echo ===================================================
pause