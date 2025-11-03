@echo off
echo ============================================
echo INICIANDO SISTEMA ANM-FRI
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando BACKEND en puerto 5000...
start "Backend ANM-FRI" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando FRONTEND en Vite...
start "Frontend ANM-FRI" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo ✅ Sistema iniciado!
echo ============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Presiona CTRL+C en cada ventana para detener
echo ============================================
