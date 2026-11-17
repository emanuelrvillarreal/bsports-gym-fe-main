@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

python "%SCRIPT_DIR%deploy.py" --local %*
if errorlevel 1 exit /b %errorlevel%
