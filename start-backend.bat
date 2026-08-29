@echo off
title CarePulse Hospital - Backend API Server
echo ============================================================
echo Starting CarePulse Hospital Backend API Server...
echo ============================================================

set "NODE_PATH=C:\Users\bhuvi\node_runtime\node-v20.18.0-win-x64"
if exist "%NODE_PATH%" (
    set "PATH=%NODE_PATH%;%PATH%"
)

cd /d "%~dp0backend"
echo Node version:
node -v
echo Starting backend server on http://localhost:5000...
node ./node_modules/tsx/dist/cli.mjs src/server.ts
pause
