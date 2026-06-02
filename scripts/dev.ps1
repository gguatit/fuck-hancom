$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$CargoHome = Join-Path $ProjectRoot '.cargo'
$RustupHome = Join-Path $ProjectRoot '.rustup'
$Vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'

$env:CARGO_HOME = $CargoHome
$env:RUSTUP_HOME = $RustupHome
$env:Path = "$CargoHome\bin;$env:Path"

# MSVC env
$envLines = & cmd /c "`"$Vcvars`" >NUL && set" 2>$null
foreach ($line in $envLines) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_()]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

Write-Host "cargo $(cargo --version)" -ForegroundColor Cyan
Write-Host "Starting HOP dev..." -ForegroundColor Green

Push-Location "$ProjectRoot\apps\desktop"
pnpm run dev
