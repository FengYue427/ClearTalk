@echo off
chcp 65001 >nul 2>&1
echo.
echo ========================================
echo         ClearTalk Launcher
echo ========================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 未检测到 Node.js，请安装: https://nodejs.org/
    pause
    exit /b 1
)

cd /d "%~dp0"

if not exist "node_modules" (
    echo [INFO] 安装前端依赖...
    call npm install
)

cd backend
if not exist "node_modules" (
    echo [INFO] 安装后端依赖...
    call npm install
)
if not exist ".env" (
    echo [WARN] 请配置 backend\.env（可复制 .env.example）
    copy .env.example .env >nul 2>&1
    notepad .env
    pause
    exit /b 1
)
cd ..

echo.
echo [INFO] 启动后端 http://localhost:3000 与前端 http://localhost:8080
echo [INFO] 按 Ctrl+C 停止
echo.

call npm run dev:all

pause
