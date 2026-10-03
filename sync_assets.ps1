# ==============================================================================
# Asset Synchronization Script
# Copies web files into Android Studio's asset directory for offline APK build
# ==============================================================================

$srcDir = $PSScriptRoot
$destDir = Join-Path $srcDir "android\app\src\main\assets\game"

Write-Host "Syncing game files to Android Studio assets..." -ForegroundColor Cyan

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Copy root web files
Copy-Item (Join-Path $srcDir "index.html") $destDir -Force
Copy-Item (Join-Path $srcDir "style.css") $destDir -Force

# Copy js folder
Copy-Item (Join-Path $srcDir "js") $destDir -Recurse -Force

# Copy assets folder
Copy-Item (Join-Path $srcDir "assets") $destDir -Recurse -Force

Write-Host "Sync complete! Android project is ready to build in Android Studio." -ForegroundColor Green
