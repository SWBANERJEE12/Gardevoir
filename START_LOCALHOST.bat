@echo off
setlocal
cd /d "%~dp0"

echo.
echo  GARDEVOIR local test
echo  Frontend  http://localhost:3000
echo  API       http://localhost:8000
echo  Demo app  http://localhost:5001
echo.

start "Gardevoir API" cmd /k "cd /d "%~dp0backend" && py -3 -m pip install -r requirements.txt && py -3 -m uvicorn main:app --reload --port 8000"
start "Gardevoir Demo" cmd /k "cd /d "%~dp0demo-target" && py -3 -m pip install -r requirements.txt && py -3 app.py"
start "Gardevoir UI" cmd /k "cd /d "%~dp0frontend" && npm install && npm run dev"

timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"
echo Opened http://localhost:3000
echo Sign up with email and password to test immediately.
echo Add Google/GitHub keys in backend\.env to enable those buttons.
endlocal
