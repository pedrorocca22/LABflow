@echo off
chcp 65001 >nul
cls

echo ==========================================
echo   LABFLOW - Iniciando aplicación
echo ==========================================
echo.

:: Verificar que exista node_modules
if not exist "node_modules" (
    echo [INFO] Instalando dependencias por primera vez...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias.
        pause
        exit /b 1
    )
    echo.
)

:: Verificar que exista la carpeta dist
if not exist "dist" (
    echo [INFO] Compilando aplicación...
    echo.
    call npm run build
    if errorlevel 1 (
        echo [ERROR] No se pudo compilar la aplicación.
        pause
        exit /b 1
    )
    echo.
)

echo [OK] Abriendo aplicación en http://localhost:4173 ...
echo.
echo Presiona Ctrl+C para detener el servidor.
echo.

:: Abrir navegador
timeout /t 2 >nul
start http://localhost:4173

:: Iniciar servidor de preview
npm run preview
