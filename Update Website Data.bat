@echo off
cd /d "%~dp0"
".venv\Scripts\python.exe" publish_data.py
if errorlevel 1 (
  echo.
  echo Publishing did not finish. Check the message above.
)
echo.
pause
