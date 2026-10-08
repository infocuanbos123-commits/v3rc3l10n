@echo off
title MetroMovies by dbarya - Launcher
color 0E

cd /d "%~dp0"

echo ===================================================
echo     METROMOVIES - ASIAN DRAMA ^& MOVIE STREAMING
echo                 Engineered by dbarya
echo ===================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di komputer kamu!
    echo Silakan install Node.js terlebih dahulu di https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check node_modules
if not exist "node_modules\" (
    echo [INFO] Folder node_modules belum ada. Menginstall dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Gagal menginstall dependencies.
        pause
        exit /b 1
    )
    echo [INFO] Dependencies berhasil di-install!
    echo.
)

echo [INFO] Membuka browser ke http://localhost:3000 dalam 3 detik...
start /b "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [INFO] Menjalankan Next.js server (npm run dev)...
echo Tekan CTRL + C untuk menghentikan server kapan saja.
echo ===================================================
echo.

call npm run dev

pause
