@echo off
chcp 65001 >nul
title CEO Directive System - STOP ALL
color 0C

echo ==========================================
echo   CEO DIRECTIVE SYSTEM - TAT TAT CA
echo   %date% %time%
echo ==========================================
echo.

:: Kill all node processes related to our scripts
taskkill /FI "WINDOWTITLE eq CEO-TelegramBot*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq CEO-Scheduler*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq CEO-Bridge*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq CEO-Dashboard*" /T /F 2>nul

echo.
echo   Da tat tat ca services.
echo ==========================================
echo.
pause
