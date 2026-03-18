@echo off
chcp 65001 >nul
title CEO Directive System - ALL SERVICES
color 0A

echo ==========================================
echo   CEO DIRECTIVE SYSTEM - KHOI DONG TAT CA
echo   %date% %time%
echo ==========================================
echo.
echo   [1] Telegram Bot (polling)
echo   [2] Scheduler (WF1-5 cron daemon)
echo   [3] OpenClaw Bridge (HTTP :3100)
echo   [4] Static Dashboard (HTTP :8080)
echo.
echo ==========================================
echo.

cd /d "%~dp0"

:: --- Start Telegram Bot ---
echo [START] Telegram Bot...
start "CEO-TelegramBot" /min cmd /k "cd /d %~dp0 && node telegram-bot.js"
timeout /t 2 /nobreak >nul

:: --- Start Scheduler ---
echo [START] Scheduler (WF1-5)...
start "CEO-Scheduler" /min cmd /k "cd /d %~dp0 && node scheduler.js"
timeout /t 1 /nobreak >nul

:: --- Start OpenClaw Bridge ---
echo [START] OpenClaw Bridge...
start "CEO-Bridge" /min cmd /k "cd /d %~dp0 && node openclaw-bridge.js"
timeout /t 1 /nobreak >nul

:: --- Start Static File Server for Dashboard ---
echo [START] Dashboard Server (port 8080)...
start "CEO-Dashboard" /min cmd /k "cd /d %~dp0\.. && python -m http.server 8080 --bind 127.0.0.1"
timeout /t 1 /nobreak >nul

echo.
echo ==========================================
echo   TAT CA DA KHOI DONG!
echo ==========================================
echo.
echo   Telegram Bot:    dang chay (polling)
echo   Scheduler:       dang chay (WF1-5 cron)
echo   Bridge:          http://localhost:3100
echo   Dashboard:       http://127.0.0.1:8080/data/dashboard/
echo.
echo   De tat: dong tat ca cua so CMD hoac
echo          chay stop-all.bat
echo ==========================================
echo.
pause
