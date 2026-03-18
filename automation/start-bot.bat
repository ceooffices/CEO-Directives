@echo off
title CEO Directive Bot - Telegram
echo ==========================================
echo   CEO Directive Bot - Starting...
echo   %date% %time%
echo ==========================================
echo.

cd /d "%~dp0"
node telegram-bot.js

echo.
echo [BOT] Process ended. Press any key to exit...
pause >nul
