Add-Type -AssemblyName System.Drawing

$assetsDir = Join-Path $PSScriptRoot "..\src\assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Gradient background
$rect = New-Object System.Drawing.Rectangle 0, 0, 256, 256
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(15, 23, 42),
    [System.Drawing.Color]::FromArgb(2, 6, 23),
    45
)
$g.FillRectangle($brush, $rect)

# Rounded inner glow circle
$penGlow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 6, 182, 212), 6)
$g.DrawEllipse($penGlow, 28, 28, 200, 200)

# Cyan/Teal accent arc (StayFree style circular tracker progress)
$penArc = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 6, 182, 212), 16)
$penArc.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penArc.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($penArc, 36, 36, 184, 184, -90, 280)

# Purple secondary accent indicator
$penArc2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 168, 85, 247), 8)
$penArc2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$penArc2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($penArc2, 54, 54, 148, 148, 45, 120)

# Text "iL"
$font = New-Object System.Drawing.Font("Segoe UI", 68, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("iL", $font, $textBrush, (New-Object System.Drawing.RectangleF 0, 0, 256, 256), $sf)

$iconPngPath = Join-Path $assetsDir "icon.png"
$bmp.Save($iconPngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Tray icon: 32x32 crisp icon
$trayBmp = New-Object System.Drawing.Bitmap $bmp, (New-Object System.Drawing.Size 32, 32)
$trayPngPath = Join-Path $assetsDir "tray.png"
$trayBmp.Save($trayPngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Also create icon.ico
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $assetsDir "icon.ico"
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$g.Dispose()
$bmp.Dispose()
$trayBmp.Dispose()
Write-Output "Icons generated successfully in $assetsDir"

