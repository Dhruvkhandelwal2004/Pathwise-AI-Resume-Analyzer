
@echo off
setlocal EnableExtensions

rem Always run relative to this file, even when it is opened by double-click.
cd /d "%~dp0"

rem Internal service modes are used by the three terminal windows opened below.
if /i "%~1"=="--backend" (
    title Pathwise - Node API - port 5001
    cd /d "%~dp0backend"
    echo Starting Node API at http://localhost:5001 ...
    echo.
    call npm start
    echo.
    echo [STOPPED] The Node API has stopped.
    exit /b
)

if /i "%~1"=="--python" (
    title Pathwise - Python API - port 8000
    cd /d "%~dp0python-backend"
    echo Starting Python API at http://127.0.0.1:8000 ...
    echo.
    "%~dp0python-backend\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8000
    echo.
    echo [STOPPED] The Python API has stopped.
    exit /b
)

if /i "%~1"=="--frontend" (
    title Pathwise - Website - port 5173
    cd /d "%~dp0frontend"
    echo Starting website at http://localhost:5173 ...
    echo.
    call npm run dev
    echo.
    echo [STOPPED] The website has stopped.
    exit /b
)

if /i "%~1"=="--help" (
    echo Double-click run-pathwise.bat to install missing dependencies and start Pathwise.
    echo.
    echo Services:
    echo   Website:    http://localhost:5173
    echo   Node API:   http://localhost:5001
    echo   Python API: http://127.0.0.1:8000
    exit /b 0
)

title Pathwise - Starting
echo.
echo ========================================================
echo   Pathwise - AI Resume System
echo ========================================================
echo.
echo Checking the required software...

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js was not found.
    echo Install the LTS version from https://nodejs.org/ and run this file again.
    goto :failed
)

where npm >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] npm was not found. Reinstall Node.js with npm enabled.
    goto :failed
)

rem Create the Python virtual environment on the first run.
if not exist "python-backend\venv\Scripts\python.exe" (
    echo [SETUP] Creating the Python virtual environment...
    where py >nul 2>&1
    if not errorlevel 1 (
        py -3 -m venv "python-backend\venv"
    ) else (
        where python >nul 2>&1
        if errorlevel 1 (
            echo.
            echo [ERROR] Python 3 was not found.
            echo Install Python 3 from https://www.python.org/downloads/ and run this file again.
            goto :failed
        )
        python -m venv "python-backend\venv"
    )
    if errorlevel 1 (
        echo.
        echo [ERROR] Could not create python-backend\venv.
        goto :failed
    )
)

rem Install only when a required local package is absent.
if not exist "backend\node_modules\express\package.json" (
    echo [SETUP] Installing backend packages...
    pushd "backend"
    call npm install
    if errorlevel 1 (
        popd
        echo.
        echo [ERROR] Backend package installation failed.
        goto :failed
    )
    popd
)

if not exist "frontend\node_modules\vite\package.json" (
    echo [SETUP] Installing frontend packages...
    pushd "frontend"
    call npm install
    if errorlevel 1 (
        popd
        echo.
        echo [ERROR] Frontend package installation failed.
        goto :failed
    )
    popd
)

"python-backend\venv\Scripts\python.exe" -c "import fastapi, groq, uvicorn, pypdf, multipart" >nul 2>&1
if errorlevel 1 (
    echo [SETUP] Installing Python packages...
    "python-backend\venv\Scripts\python.exe" -m pip install -r "python-backend\requirements.txt"
    if errorlevel 1 (
        echo.
        echo [ERROR] Python package installation failed.
        goto :failed
    )
)

rem Both APIs can use backend\.env. Create a clearly marked template if needed.
if not exist "backend\.env" (
    copy /y "backend\.env.example" "backend\.env" >nul
    echo.
    echo [WARNING] backend\.env was created from the example file.
    echo Add your real GROQ_API_KEY to backend\.env for AI analysis to work.
)

findstr /b /c:"GROQ_API_KEY=replace_" "backend\.env" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [WARNING] GROQ_API_KEY is still a placeholder in backend\.env.
    echo The site will open, but AI analysis needs a valid Groq API key.
)

echo.
echo Starting all Pathwise services...
start "Pathwise - Node API - port 5001" cmd /k call "%~f0" --backend
start "Pathwise - Python API - port 8000" cmd /k call "%~f0" --python
start "Pathwise - Website - port 5173" cmd /k call "%~f0" --frontend

echo Waiting briefly for the website...
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo [READY] Pathwise is starting at http://localhost:5173
echo Keep the three service windows open while using the app.
echo Close those windows, or press Ctrl+C in each one, to stop Pathwise.
echo.
exit /b 0

:failed
echo.
echo Pathwise could not be started. Fix the error above and try again.
echo.
pause
exit /b 1
