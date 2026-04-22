#!/bin/bash

echo "==================================================="
echo "Welcome to the Mockvestor!"
echo "==================================================="
echo ""
# Note: Using 0.0.0.0 tells FastAPI to listen on all local network IP addresses automatically.
echo "IMPORTANT PRE-FLIGHT CHECK:"
echo "1. Did you paste your .env file into ./server/src/core/ ?"
echo "2. Did you update ./mobile/config.ts with your computer's IP address?"
echo ""
read -p "Press [Enter] to continue..."

echo ""
echo "[1/3] Setting up Python Virtual Environment..."

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

echo ""
echo "[2/3] Launching Backend Server..."
# This opens a new Terminal window, activates the venv, installs dependencies, and runs FastAPI
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && source .venv/bin/activate && echo \"Installing Python dependencies...\" && pip install --upgrade pip && pip install -r requirements.txt && cd server && echo \"Starting FastAPI...\" && fastapi dev main.py --host 0.0.0.0 --port 8080"'

echo "[3/3] Launching Mobile Frontend..."
# This opens a second Terminal window, installs node modules, and runs Expo
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/mobile\" && echo \"Installing Mobile dependencies...\" && npm install && npx expo install && npx expo install expo-secure-store && echo \"Starting Expo Server...\" && npx expo start"'

echo ""
echo "==================================================="
echo "Launch sequence initiated!"
echo "Two new terminal windows have opened."
echo "You can safely close this setup window."
echo "==================================================="