@echo off
title Tutorial Video Streamer
color 0B
echo ========================================================
echo       Starting Tutorial Video Streamer Server...        
echo ========================================================
echo.
cd /d "%~dp0\backend"
node server.js
pause
