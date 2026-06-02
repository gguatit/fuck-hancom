$ErrorActionPreference = 'Stop'
$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$CargoHome = Join-Path $ProjectRoot '.cargo'
$RustupHome = Join-Path $ProjectRoot '.rustup'
$ToolchainBin = Join-Path $RustupHome 'toolchains\stable-x86_64-pc-windows-msvc\bin'
$Vcvars = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat'

if (-not (Test-Path -LiteralPath $ToolchainBin)) {
    throw "Local Rust toolchain not found at $ToolchainBin"
}
if (-not (Test-Path -LiteralPath $Vcvars)) {
    throw "vcvars64.bat not found at $Vcvars"
}

# Capture MSVC env vars
$cmd = "`"$Vcvars`" >NUL && set"
$envLines = & cmd /c $cmd 2>$null
foreach ($line in $envLines) {
    if ($line -match '^([A-Za-z_][A-Za-z0-9_()]*)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}

$env:CARGO_HOME = $CargoHome
$env:RUSTUP_HOME = $RustupHome
$env:CARGO_TARGET_DIR = Join-Path $ProjectRoot 'apps\desktop\src-tauri\target'
$env:Path = "$ToolchainBin;$($env:Path -replace [regex]::Escape("$CargoHome\bin;"), '')"

$cargoRoot = Join-Path $ProjectRoot 'apps\desktop\src-tauri'
Push-Location -LiteralPath $cargoRoot
try {
    & "$ToolchainBin\cargo.exe" @args
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $exitCode
