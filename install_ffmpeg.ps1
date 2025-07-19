# FFmpeg Installation Script for MP3 Downloader & Converter
# Run this script as Administrator

Write-Host "Installing FFmpeg..." -ForegroundColor Green

# Check if running as administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script requires administrator privileges." -ForegroundColor Red
    Write-Host "Please right-click on PowerShell and 'Run as Administrator'" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Use chocolatey if available, otherwise manual installation
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Installing FFmpeg using Chocolatey..." -ForegroundColor Yellow
    choco install ffmpeg -y
} else {
    Write-Host "Installing FFmpeg manually..." -ForegroundColor Yellow
    
    # Create FFmpeg directory
    $ffmpegDir = "C:\ffmpeg"
    if (!(Test-Path $ffmpegDir)) {
        New-Item -ItemType Directory -Path $ffmpegDir | Out-Null
    }
    
    # Download FFmpeg
    $url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    $zipPath = "$ffmpegDir\ffmpeg.zip"
    
    try {
        Write-Host "Downloading FFmpeg..." -ForegroundColor Yellow
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $url -OutFile $zipPath
        
        # Extract FFmpeg
        Write-Host "Extracting FFmpeg..." -ForegroundColor Yellow
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $ffmpegDir)
        
        # Find extracted folder and move contents
        $extractedFolder = Get-ChildItem -Path $ffmpegDir -Directory | Where-Object { $_.Name.StartsWith("ffmpeg-") }
        if ($extractedFolder) {
            Move-Item -Path "$($extractedFolder.FullName)\bin\*" -Destination $ffmpegDir -Force
            Remove-Item -Path $extractedFolder.FullName -Recurse -Force
        }
        
        # Add to PATH
        Write-Host "Adding FFmpeg to system PATH..." -ForegroundColor Yellow
        $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$ffmpegDir*") {
            [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$ffmpegDir", "Machine")
        }
        
        # Cleanup
        Remove-Item -Path $zipPath -Force
        
        Write-Host "FFmpeg installation completed successfully!" -ForegroundColor Green
        Write-Host "Please restart your applications or open a new terminal for PATH changes to take effect." -ForegroundColor Yellow
    }
    catch {
        Write-Host "Error installing FFmpeg: $_" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "Testing FFmpeg installation..." -ForegroundColor Yellow
try {
    & ffmpeg -version | Select-Object -First 1
    Write-Host "FFmpeg is now available!" -ForegroundColor Green
}
catch {
    Write-Host "FFmpeg installation may require a system restart to be available." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
