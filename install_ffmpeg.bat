@echo off
echo Installing FFmpeg for MP3 Downloader & Converter...
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator...
) else (
    echo This script requires administrator privileges to install FFmpeg.
    echo Please right-click and "Run as administrator"
    pause
    exit /b 1
)

:: Create FFmpeg directory
set FFMPEG_DIR=C:\ffmpeg
if not exist "%FFMPEG_DIR%" mkdir "%FFMPEG_DIR%"

:: Download FFmpeg
echo Downloading FFmpeg...
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile '%FFMPEG_DIR%\ffmpeg.zip'}"

if not exist "%FFMPEG_DIR%\ffmpeg.zip" (
    echo Failed to download FFmpeg. Please check your internet connection.
    pause
    exit /b 1
)

:: Extract FFmpeg
echo Extracting FFmpeg...
powershell -Command "& {Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('%FFMPEG_DIR%\ffmpeg.zip', '%FFMPEG_DIR%')}"

:: Find the extracted folder and move contents
for /d %%i in ("%FFMPEG_DIR%\ffmpeg-*") do (
    echo Moving FFmpeg files...
    move "%%i\bin\*" "%FFMPEG_DIR%\"
    rmdir /s /q "%%i"
)

:: Add to PATH
echo Adding FFmpeg to system PATH...
setx /M PATH "%PATH%;%FFMPEG_DIR%" >nul 2>&1

:: Cleanup
del "%FFMPEG_DIR%\ffmpeg.zip"

echo.
echo FFmpeg installation completed successfully!
echo You may need to restart your computer or open a new command prompt for the PATH changes to take effect.
echo.
echo To test FFmpeg installation, open a new command prompt and type: ffmpeg -version
echo.
pause
