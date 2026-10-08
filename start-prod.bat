@echo off
title MetroMovies by dbarya - Production Mode
color 0A

cd /d "%~dp0"

echo ===================================================
echo     METROMOVIES - PRODUCTION SERVER LAUNCHER
echo                 Engineered by dbarya
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di komputer kamu!
    pause
    exit /b 1
)

:: Build if .next folder does not exist
if not exist ".next\" (
    echo [INFO] Menyiapkan production build...
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Build gagal.
        pause
        exit /b 1
    )
)

echo [INFO] Membuka browser ke http://localhost:3000 dalam 3 detik...
start /b "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [INFO] Menjalankan Production Server (npm start)...
echo Tekan CTRL + C untuk menghentikan server.
echo ===================================================
echo.

call npm start

pause
