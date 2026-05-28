@echo off
echo ===============================================
echo     SISTEMA POS - Negocio Mediano/Pequeno
echo ===============================================
echo.
echo Iniciando backend (puerto 3001)...
start "Backend POS" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 >nul
echo Iniciando frontend (puerto 5173)...
start "Frontend POS" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 3 >nul
echo.
echo Abriendo el sistema en el navegador...
start http://localhost:5173
echo.
echo Sistema iniciado. Podés cerrar esta ventana.
pause
