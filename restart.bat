@echo off
echo [XR Unicorn] Restarting dev server...
taskkill /F /IM node.exe 2>nul
npm run start
