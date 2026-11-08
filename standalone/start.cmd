@echo off
setlocal
set "HOLOCRON_APP_DIR=%~dp0app"
set "HOLOCRON_DATA_DIR=%LOCALAPPDATA%\Holocron"
set "HOLOCRON_PORT=8765"
if not exist "%~dp0runtime\node.exe" (
  echo Missing bundled runtime\node.exe. Rebuild this package on Windows.
  exit /b 1
)
"%~dp0runtime\node.exe" "%~dp0server.mjs"
