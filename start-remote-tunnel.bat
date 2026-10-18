@echo off
title TutorialStream Remote HTTPS Tunnel
color 0A
echo ========================================================
echo       Starting Cloudflare Remote HTTPS Tunnel...        
echo ========================================================
echo.
echo  This generates a secure HTTPS URL for your laptop server.
echo  You can paste this URL into your Vercel app on your phone
echo  to stream videos from anywhere in the world!
echo.
echo ========================================================
echo.
npx cloudflared tunnel --url http://localhost:5000
pause
