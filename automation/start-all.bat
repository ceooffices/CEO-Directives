@echo off
chcp 65001 >nul
title CEO Directive System - ALL SERVICES
color 0A

echo ==========================================
echo   CEO DIRECTIVE SYSTEM - KHOI DONG TAT CA
echo   %date% %time%
echo ==========================================
echo.
echo   [1] AI Scheduler (Claude-powered)
echo   [2] OpenClaw Bridge (HTTP :PORT_BRIDGE)
echo   [3] Static Dashboard (HTTP :PORT_DASHBOARD)
echo   NOTE: Telegram Bot = OpenClaw Gateway (token da chuyen sang OpenClaw)
echo.
echo ==========================================
echo.

cd /d "%~dp0"

:: --- Load port từ .env (fallback mặc định) ---
set PORT_BRIDGE=3101
set PORT_DASHBOARD=8081
set PORT_TELEGRAM_HOOK=3102
if exist ".env" (
  for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if "%%A"=="PORT_BRIDGE" set PORT_BRIDGE=%%B
    if "%%A"=="PORT_DASHBOARD" set PORT_DASHBOARD=%%B
    if "%%A"=="PORT_TELEGRAM_HOOK" set PORT_TELEGRAM_HOOK=%%B
  )
)

:: --- Telegram Bot: da chuyen sang OpenClaw Gateway ---
:: Khong start telegram-bot.js o day de tranh conflict bot token
:: Bot token 8530719394 duoc quan ly boi OpenClaw (account: ceo-directives)

:: --- Start AI Scheduler ---
echo [START] AI Scheduler (Claude-powered)...
start "CEO-Scheduler" /min cmd /k "cd /d %~dp0 && node ai-scheduler.js"
timeout /t 1 /nobreak >nul

:: --- Start OpenClaw Bridge ---
echo [START] OpenClaw Bridge (port %PORT_BRIDGE%)...
start "CEO-Bridge" /min cmd /k "cd /d %~dp0 && node openclaw-bridge.js"
timeout /t 1 /nobreak >nul

:: --- Start Static File Server for Dashboard ---
echo [START] Dashboard Server (port %PORT_DASHBOARD%)...
start "CEO-Dashboard" /min cmd /k "cd /d %~dp0\.. && python -m http.server %PORT_DASHBOARD% --bind 127.0.0.1"
timeout /t 1 /nobreak >nul

echo.
echo ==========================================
echo   TAT CA DA KHOI DONG!
echo ==========================================
echo.
echo   Telegram Bot:    OpenClaw Gateway (token quan ly boi OpenClaw)
echo   AI Scheduler:    dang chay (Claude-powered)
echo   Bridge:          http://localhost:%PORT_BRIDGE%
echo   Dashboard:       http://127.0.0.1:%PORT_DASHBOARD%/data/dashboard/
echo.
echo   De tat: dong tat ca cua so CMD hoac
echo          chay stop-all.bat
echo ==========================================
echo.
pause
