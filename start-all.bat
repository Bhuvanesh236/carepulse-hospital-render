@echo off
title CarePulse Hospital - Master Launcher
echo ============================================================
echo 🏥 CarePulse Hospital Appointment & Queue Optimization System
echo ============================================================
echo Starting both Backend Server and Frontend Client...
echo.

set "NODE_PATH=C:\Users\bhuvi\node_runtime\node-v20.18.0-win-x64"
if exist "%NODE_PATH%" (
    set "PATH=%NODE_PATH%;%PATH%"
)

echo [1/2] Launching Backend API Server (Port 5000)...
start "CarePulse Backend API" cmd /k "call \"%~dp0start-backend.bat\""

timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend Web App (Port 5173)...
start "CarePulse Frontend" cmd /k "call \"%~dp0start-frontend.bat\""

timeout /t 2 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo ============================================================
echo System launched successfully!
echo - Frontend URL: http://localhost:5173
echo - Backend API:  http://localhost:5000/api
echo ============================================================
