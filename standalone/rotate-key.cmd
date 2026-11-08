@echo off
setlocal
set "HOLOCRON_DATA_DIR=%LOCALAPPDATA%\Holocron"
"%~dp0runtime\node.exe" "%~dp0rotate-key.mjs"
