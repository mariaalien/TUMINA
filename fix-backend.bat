@echo off
echo ============================================
echo SOLUCIONANDO ERROR DE PRISMA EN BACKEND
echo ============================================
echo.

cd backend

echo [1/6] Eliminando node_modules...
if exist node_modules rd /s /q node_modules

echo [2/6] Eliminando package-lock.json...
if exist package-lock.json del package-lock.json

echo [3/6] Instalando dependencias...
call npm install

echo [4/6] Generando Prisma Client...
call npx prisma generate

echo [5/6] Ejecutando migraciones...
call npx prisma migrate dev

echo [6/6] Iniciando servidor...
echo.
echo ============================================
echo ✅ Backend listo! Iniciando servidor...
echo ============================================
echo.

call npm start
