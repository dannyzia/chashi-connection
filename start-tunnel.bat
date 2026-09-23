@echo off
setlocal
rem Always run from the folder this file lives in, so the config is found.
cd /d "%~dp0"

if not exist "mcp-local-tunnel.config.json" (
  echo [ERROR] mcp-local-tunnel.config.json was not found in %CD%
  pause
  exit /b 1
)

rem Check the config is valid JSON before launching.
node -e "JSON.parse(require('fs').readFileSync('mcp-local-tunnel.config.json','utf8'))" 2>nul
if errorlevel 1 (
  echo [ERROR] mcp-local-tunnel.config.json is not valid JSON.
  echo Common causes:
  echo   - Single backslashes in a Windows path. Use / or double them.
  echo   - Stray backslashes before square brackets.
  echo   - A missing or extra comma.
  pause
  exit /b 1
)

echo Starting MCP Local Tunnel agent...
call npx -y mcp-local-tunnel
echo.
echo Logs: %USERPROFILE%\.config\mcp-local-tunnel\logs
echo Leave this window open while you use the tunnel.
pause
