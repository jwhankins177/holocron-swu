$ErrorActionPreference = 'Stop'
$package = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtime = Join-Path $package 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $runtime)) { throw 'Bundled Node runtime is missing. Build the package on Windows.' }
$env:HOLOCRON_APP_DIR = Join-Path $package 'app'
$env:HOLOCRON_DATA_DIR = Join-Path $env:LOCALAPPDATA 'Holocron'
$env:HOLOCRON_PORT = '8765'
& $runtime (Join-Path $package 'server.mjs')
