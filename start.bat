@echo off
echo Starting Radio Garden Development Server...
echo.

cd frontend

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting Vite development server...
call npm run dev

pause

