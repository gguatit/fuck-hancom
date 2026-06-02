# Sets up the local Rust toolchain + MSVC environment for this project.
# Use: . .\scripts\use-rust-local.ps1   (dot-source to keep env in current session)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CargoHome = Join-Path $ProjectRoot '.cargo'
$RustupHome = Join-Path $ProjectRoot '.rustup'
$ToolchainBin = Join-Path $RustupHome 'toolchains\stable-x86_64-pc-windows-msvc\bin'
$VcvarsCandidates = @(
    'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat',
    'C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat',
    'C:\Program Files (x86)\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat',
    'C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat'
)

if (-not (Test-Path -LiteralPath $ToolchainBin)) {
    throw "Local Rust toolchain not found at $ToolchainBin. Run scripts\install-rust-local.ps1 first."
}

$Vcvars = $null
foreach ($candidate in $VcvarsCandidates) {
    if (Test-Path -LiteralPath $candidate) { $Vcvars = $candidate; break }
}
if (-not $Vcvars) {
    throw "vcvars64.bat not found. Install Visual Studio 2022 Build Tools (C++ workload + Windows SDK)."
}

# Capture vcvars64 env vars into current process
$cmd = "`"$Vcvars`" >NUL && set"
$envLines = & cmd /c $cmd 2>$null
foreach ($line in $envLines) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_()]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

# Local Rust paths take priority over rustup proxy
$env:CARGO_HOME = $CargoHome
$env:RUSTUP_HOME = $RustupHome
$env:CARGO_TARGET_DIR = Join-Path $ProjectRoot 'apps\desktop\src-tauri\target'

$pathParts = @($ToolchainBin) + ($env:Path -split ';' | Where-Object { $_ -and $_ -notlike '*\.cargo\bin*' -and $_ -ne $ToolchainBin })
$env:Path = ($pathParts -join ';')

Write-Host "[env] CARGO_HOME = $env:CARGO_HOME" -ForegroundColor Cyan
Write-Host "[env] RUSTUP_HOME = $env:RUSTUP_HOME" -ForegroundColor Cyan
Write-Host "[env] CARGO_TARGET_DIR = $env:CARGO_TARGET_DIR" -ForegroundColor Cyan
$libFirst = ($env:LIB -split ';')[0]
$incFirst = ($env:INCLUDE -split ';')[0]
Write-Host "[env] LIB = $libFirst" -ForegroundColor Cyan
Write-Host "[env] INCLUDE = $incFirst" -ForegroundColor Cyan
Write-Host "[env] where link.exe:" -ForegroundColor Cyan
& where.exe link.exe 2>$null | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
Write-Host ""
& "$ToolchainBin\rustc.exe" --version
& "$ToolchainBin\cargo.exe" --version
& "$ToolchainBin\clippy-driver.exe" --version
