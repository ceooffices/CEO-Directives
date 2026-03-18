@echo off
title CEO Control Panel
echo ==================================
echo   CEO CONTROL PANEL
echo ==================================
echo.

cd /d "%~dp0"

start http://localhost:9000
timeout /t 1 /nobreak >nul

node control-panel.js
