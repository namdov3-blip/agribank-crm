@echo off
echo ========================================
echo   Agribank CRM Backend Setup Script
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [1/6] Creating .env file from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit .env file and set your PostgreSQL password!
    echo    DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/agribank_crm?schema=public"
    echo.
    pause
) else (
    echo [1/6] .env file already exists ✓
)

echo.
echo [2/6] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed!
    pause
    exit /b 1
)
echo ✓ Dependencies installed

echo.
echo [3/6] Generating Prisma Client...
call npm run prisma:generate
if errorlevel 1 (
    echo ❌ Prisma generate failed!
    pause
    exit /b 1
)
echo ✓ Prisma Client generated

echo.
echo [4/6] Running database migrations...
call npm run prisma:migrate
if errorlevel 1 (
    echo ❌ Migration failed! Make sure:
    echo    - PostgreSQL is running
    echo    - Database 'agribank_crm' exists
    echo    - Password in .env is correct
    pause
    exit /b 1
)
echo ✓ Migrations completed

echo.
echo [5/6] Seeding database with demo data...
call npm run prisma:seed
if errorlevel 1 (
    echo ❌ Seeding failed!
    pause
    exit /b 1
)
echo ✓ Database seeded

echo.
echo [6/6] Testing backend health...
timeout /t 2 >nul
curl http://localhost:3001/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend not running yet (normal - will start with npm run dev)
) else (
    echo ✓ Backend is running!
)

echo.
echo ========================================
echo   Setup Complete! ✅
echo ========================================
echo.
echo Next steps:
echo   1. Start backend: npm run dev
echo   2. Open new terminal
echo   3. Go to frontend: cd E:\Final-main
echo   4. Start frontend: npm run dev
echo   5. Open browser: http://localhost:3000
echo   6. Login: admin_org001 / admin123
echo.
echo Press any key to start backend now...
pause >nul

echo.
echo Starting backend server...
call npm run dev
