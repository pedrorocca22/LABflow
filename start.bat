@echo off
chcp 65001 >nul
echo =================================
echo   LABFLOW - Iniciando servidor
echo =================================
echo.
echo Abriendo http://localhost:8080 ...
echo.
start http://localhost:8080
node server.js
