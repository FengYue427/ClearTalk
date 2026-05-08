@echo off
chcp 65001 >nul 2>&1
echo.
echo ========================================
echo         ClearTalk Launcher
echo ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected
echo.

:: Check backend dependencies
cd backend
if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Check .env file
if not exist ".env" (
    echo.
    echo [WARN] Environment variables not configured
    echo Please copy .env.example to .env and add your Deepseek API Key
    echo.
    notepad .env.example
    pause
    exit /b 1
)

echo.
echo [INFO] Starting backend server...
echo [INFO] Press Ctrl+C to stop
echo.

echo.
echo [INFO] ========================================
echo [INFO] 1. Backend starting at: http://localhost:3000
echo [INFO] 2. Open index.html in your browser
echo [INFO] ========================================
echo.

:: Start backend
npm start

pause
