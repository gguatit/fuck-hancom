# Build script for Fuck Hancom on Windows (GNU toolchain)
# Ensures WebView2Loader.dll is bundled in the NSIS installer
#
# Usage:
#   powershell -File scripts/build-windows.ps1

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$minGwBin = "C:\msys64\mingw64\bin"
$nsisTools = "$env:LOCALAPPDATA\tauri\NSIS"
$targetDir = "$root\apps\desktop\src-tauri\target\debug"
$nsisDir = "$targetDir\nsis\x64"
$bundleDir = "$targetDir\bundle\nsis"
$dllPath = "$targetDir\WebView2Loader.dll"

# Set up MinGW in PATH
$env:PATH = "$minGwBin;$env:PATH"

# Build
pnpm --filter hop-desktop tauri build --debug --bundles nsis
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

# Patch NSIS installer to include WebView2Loader.dll
$nsiPath = "$nsisDir\installer.nsi"
$nsiContent = Get-Content $nsiPath -Raw
$patch = '  File "${MAINBINARYSRCPATH}"' + "`r`n  File `"$dllPath`""
$nsiContent = $nsiContent -replace '  File "\$\{MAINBINARYSRCPATH\}"', $patch
Set-Content $nsiPath -Value $nsiContent -NoNewline

# Rebuild installer
& "$nsisTools\makensis.exe" $nsiPath
Copy-Item "$nsisDir\nsis-output.exe" "$bundleDir\Fuck Hancom_0.1.11_x64-setup.exe" -Force

Write-Host "Build complete: $bundleDir\Fuck Hancom_0.1.11_x64-setup.exe"
