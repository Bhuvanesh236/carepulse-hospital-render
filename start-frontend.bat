@echo off
title CarePulse Hospital - Frontend Client
echo ============================================================
echo Starting CarePulse Hospital Frontend Client...
echo ============================================================

set "NODE_PATH=C:\Users\bhuvi\node_runtime\node-v20.18.0-win-x64"
if exist "%NODE_PATH%" (
    set "PATH=%NODE_PATH%;%PATH%"
)

cd /d "%~dp0frontend"
echo Node version:
node -v
echo Starting Vite Dev Server on http://localhost:5173...
node ./node_modules/vite/bin/vite.js --port 5173 --host
pause
