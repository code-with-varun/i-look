# ==============================================================
# i-Look Tracker - 1-Click Portable Setup Helper
# Developed by Runit Infotech (https://runito.in)
# ==============================================================
$ErrorActionPreference = 'SilentlyContinue'
$targetExe = Join-Path $PSScriptRoot "..\release\win-unpacked\i-Look Tracker.exe"
if (-not (Test-Path $targetExe)) {
    $targetExe = Join-Path $PSScriptRoot "i-Look Tracker.exe"
}

if (-not (Test-Path $targetExe)) {
    Write-Host "[ERROR] i-Look Tracker.exe not found" -ForegroundColor Red
    Pause
    Exit
}

$targetDir = Split-Path $targetExe -Parent
$wsh = New-Object -ComObject WScript.Shell

# 1. Desktop Shortcut
$desktopPath = [Environment]::GetFolderPath('Desktop')
$desktopShortcut = $wsh.CreateShortcut((Join-Path $desktopPath "i-Look Tracker.lnk"))
$desktopShortcut.TargetPath = $targetExe
$desktopShortcut.WorkingDirectory = $targetDir
$desktopShortcut.IconLocation = "$targetExe,0"
$desktopShortcut.Description = "i-Look Screen Time & App Usage Tracker (Runit Infotech)"
$desktopShortcut.Save()
Write-Host "✓ Desktop shortcut created" -ForegroundColor Green

# 2. Windows Startup Shortcut (Minimized to Tray with --hidden)
$startupPath = [Environment]::GetFolderPath('Startup')
$startupShortcut = $wsh.CreateShortcut((Join-Path $startupPath "i-Look Tracker.lnk"))
$startupShortcut.TargetPath = $targetExe
$startupShortcut.Arguments = "--hidden"
$startupShortcut.WorkingDirectory = $targetDir
$startupShortcut.IconLocation = "$targetExe,0"
$startupShortcut.WindowStyle = 7 # Minimized
$startupShortcut.Description = "i-Look Silent Background Screen Tracker"
$startupShortcut.Save()
Write-Host "✓ Windows Startup shortcut created (starts minimized in system tray)" -ForegroundColor Green

Write-Host "`nSetup complete! You can now launch i-Look Tracker from your Desktop." -ForegroundColor Cyan
Write-Host "It will also start automatically minimized to the tray when you log in to Windows." -ForegroundColor Cyan
Start-Sleep -Seconds 3

