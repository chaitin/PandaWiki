@echo off
REM ==============================================================
REM PandaWiki - Running Status (Pure CMD)
REM All comments ENGLISH ONLY. No PowerShell required.
REM ==============================================================
chcp 936 >nul
setlocal
title PandaWiki - Running Status

cls
echo.
echo ================================================================
echo                 PandaWiki Running Status
echo ================================================================
echo.

echo [1/3] Docker Compose Containers:
where docker >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Docker NOT installed OR Docker Desktop NOT RUNNING.
    echo   -> Open Docker Desktop first ^(wait tray whale icon GREEN^).
) else (
    cd /d "%~dp0"
    docker compose ps
)
echo.

echo [2/3] Local Port LISTENING Status:
echo.
call :CHECK 5432 PostgreSQL
call :CHECK 6380 Redis_PandaWiki_6380
call :CHECK 4222 NATS
call :CHECK 8222 NATS_Monitor
call :CHECK 9000 MinIO_API
call :CHECK 9001 MinIO_Console
REM call :CHECK 8000 Go_Backend_API  (DISABLED - using Java now)
call :CHECK 8080 Java_Backend_API__MAIN
call :CHECK 5173 Admin_Frontend
call :CHECK 3010 App_Frontend
echo.

echo [3/3] Quick URLs (when everything is running):
echo.
echo   Admin login page : http://localhost:5173/   admin / admin123
echo   Wiki front page  : http://localhost:3010/
REM Go backend DISABLED now -> REM  echo   Go health check  : http://localhost:8000/ping   (expect: pong)
echo   Java health check: http://localhost:8080/ping   (expect: pong or JSON 200)
echo   NATS dashboard   : http://localhost:8222/
echo   MinIO dashboard  : http://localhost:9001/   s3panda-wiki / s3panda-wiki-secret
echo.

echo [Next steps]:
echo   All ports NO? -> Double-click start.cmd, choose option 7 (START ALL).
echo   Stop all      -> Double-click stop.cmd.
echo.
pause
endlocal
exit /b 0

:CHECK
set "P=%~1"
set "N=%~2"
netstat -ano 2>nul | findstr ":%P% " | findstr LISTENING >nul
if errorlevel 1 (
    echo     [NO]   Port %P%  %N%   NOT RUNNING
) else (
    echo     [YES]  Port %P%  %N%   RUNNING
)
goto :eof
