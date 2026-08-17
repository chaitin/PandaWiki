@echo off
REM ==============================================================
REM PandaWiki - Stop All Services (Pure CMD)
REM All comments ENGLISH ONLY. No PowerShell required.
REM ==============================================================
chcp 936 >nul
setlocal
title PandaWiki - Stop Everything

cls
echo.
echo ================================================================
echo            PandaWiki - STOP All Services (Pure CMD)
echo ================================================================
echo.

REM ---- 1. Docker compose down ----
echo [Step 1/2] Stopping Docker middleware containers ...
where docker >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Docker not found - skipped. If Docker was running manually, stop it via Docker Desktop.
) else (
    cd /d "%~dp0"
    docker compose down 2>&1
    if errorlevel 1 (
        echo   [WARN] docker compose down had issues.
        echo   -> Docker Desktop not running? That is OK (no containers to stop).
    ) else (
        echo   [OK] Docker containers stopped (volumes keep your data safe).
    )
)
echo.

REM ---- 2. Kill local dev processes by port ----
echo [Step 2/2] Killing local dev processes (by port) ...
REM call :KILL 8000 Go-Backend-API__DISABLED   (Go backend temporarily not used)
call :KILL 8080 Java-SpringBoot__MAIN_BACKEND
call :KILL 5173 Admin-Frontend-Vite
call :KILL 3010 App-Frontend-NextJs
call :KILL 5432 PostgreSQL-local-only
call :KILL 6380 Redis-PandaWiki
call :KILL 4222 NATS-local-only
call :KILL 9000 MinIO-API-local
call :KILL 9001 MinIO-Console-local

echo.
echo ================================================================
echo           All PandaWiki services STOPPED!
echo ================================================================
echo.
echo   Restart -> Double-click start.cmd
echo   Status  -> Double-click status.cmd
echo.
pause
endlocal
exit /b 0

:KILL
set "P=%~1"
set "N=%~2"
netstat -ano 2>nul | findstr ":%P% " | findstr LISTENING >nul
if errorlevel 1 (
    echo     SKIP  Port %P%  (%N%) - NOT running.
    goto :eof
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%P% " ^| findstr LISTENING') do (
    if not "%%a"=="" (
        echo     KILL  Port %P%  (%N%)  PID=%%a
        taskkill /F /PID %%a >nul 2>&1
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
goto :eof
