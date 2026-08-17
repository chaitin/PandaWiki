@echo off
REM ==============================================================
REM PandaWiki - ONE-FILE Start Menu (Pure CMD / No PowerShell needed)
REM All comments ENGLISH ONLY to avoid CMD UTF-8/GBK crash.
REM Chinese ONLY appears in final echo lines that display after chcp.
REM Changelog: Use ONLY batch syntax, NO ps1, NO quotes surprises EVER.
REM ==============================================================
chcp 936 >nul
setlocal EnableDelayedExpansion
title PandaWiki Launcher (CMD)

REM ------ Ports / Env ------
set PG_PORT=5432
set REDIS_PORT=6380
set NATS_PORT=4222
set NATS_MON=8222
set MINIO_API=9000
set MINIO_CON=9001
set GO_API=8000
set JAVA_API=8080
set ADMIN=5173
set APP=3010

set PG_DSN=host=localhost user=panda-wiki password=panda-wiki-secret dbname=panda-wiki port=5432 sslmode=disable TimeZone=Asia/Shanghai
set REDIS_ADDR=localhost:%REDIS_PORT%
set NATS_SRV=nats://panda-wiki:@localhost:%NATS_PORT%
set S3_EP=localhost:%MINIO_API%

REM ======================== MENU ========================
:MENU
cls
echo.
echo  ================================================================
echo             PandaWiki - Local Dev Start Menu (CMD)
echo  ================================================================
echo.
echo   [1]  Start 4 middleware containers (PG + Redis + NATS + MinIO)
echo   [2]  Initialize database (migrate + default admin / admin123)
echo   [3]  Go Backend 8000  -  DISABLED (now using Java/Spring Boot)
echo   [4]  Start Java Backend (Spring Boot :8080)  ** MAIN BACKEND NOW **
echo   [5]  Start Admin Frontend (Vite :5173)
echo   [6]  Start App Frontend (Next.js :3000)
echo   [7]  START ALL (1 - 2 - 4 - 5 - 6)  ** RECOMMENDED (Java + Frontend)**
echo   [8]  Show running status (docker + port scan)
echo   [0]  Exit
echo.
set "c="
set /p "c=Enter option 0-8: "

if "%c%"=="1" (
    call :MID
    goto MENU
)
if "%c%"=="2" (
    call :INITDB
    goto MENU
)
if "%c%"=="3" (
    call :GO_DISABLED
    goto MENU
)
if "%c%"=="4" (
    call :JAVA
    goto MENU
)
if "%c%"=="5" (
    call :ADMIN
    goto MENU
)
if "%c%"=="6" (
    call :APP
    goto MENU
)
if "%c%"=="7" goto ALL
if "%c%"=="8" (
    call :STATUS
    goto MENU
)
if "%c%"=="0" goto EXIT
if "%c%"=="" goto MENU
echo [WARN] Invalid choice, try again.
pause
goto MENU

REM ======================== HELPER: Port kill ========================
:CHECKPORT
set "P=%~1"
set "N=%~2"
netstat -ano 2>nul | findstr ":%P% " | findstr LISTENING >nul
if errorlevel 1 goto :eof
echo.
echo [WARN] Port %P% (%N%) ALREADY OCCUPIED:
netstat -ano | findstr ":%P% " | findstr LISTENING
echo.
set "KILL=N"
set /p "KILL=Auto kill occupying process? [Y/N, default N]: "
if /i not "%KILL%"=="Y" (
    echo [WARN] Port not released. %N% will fail. Recommend choose Y next time.
    pause
    goto :eof
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%P% " ^| findstr LISTENING') do (
    if not "%%a"=="" (
        echo   Killing PID %%a ...
        taskkill /F /PID %%a >nul 2>&1
        taskkill /F /T /PID %%a >nul 2>&1
    )
)
timeout /t 2 >nul
goto :eof

REM ======================== HELPER: Port scan (for STATUS) ========================
:SCANPORT
set "P=%~1"
set "N=%~2"
netstat -ano 2>nul | findstr ":%P% " | findstr LISTENING >nul
if errorlevel 1 ( echo     NO  Port %-5s   %-24s  NOT RUNNING ) else ( echo     YES Port %-5s   %-24s  RUNNING )
goto :eof

REM ======================== OPTION 1: Middleware ========================
:MID
echo.
echo [Step 1/3] Check Docker Desktop ...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop NOT running.
    echo   -> Open Docker Desktop, wait tray whale icon GREEN, then retry.
    pause
    exit /b 1
)
echo [OK] Docker is running.
echo.
echo [Step 2/3] Check port conflicts ...
call :CHECKPORT %PG_PORT% PostgreSQL
call :CHECKPORT %REDIS_PORT% Redis-PandaWiki-6380
call :CHECKPORT %NATS_PORT% NATS
call :CHECKPORT %MINIO_API% MinIO-API
call :CHECKPORT %MINIO_CON% MinIO-Console
echo.
echo [Step 3/3] docker compose up -d --wait  (first run pulls images, wait 1-5 min)
cd /d "%~dp0"
docker compose up -d --wait
if errorlevel 1 (
    echo.
    echo [ERROR] docker compose FAILED. Scroll up for red error:
    echo   -> Common: Bind for 0.0.0.0:XXXX failed = port occupied ^(choose Y to kill above^)
    echo   -> Common: no space left on device = Docker disk full ^(prune images^)
    pause
    exit /b 1
)
echo.
echo ================================================================
echo  [OK] 4 middleware containers STARTED successfully:
echo ----------------------------------------------------------------
echo   PostgreSQL  : localhost:%PG_PORT%   user=panda-wiki pass=panda-wiki-secret db=panda-wiki
echo   Redis       : localhost:%REDIS_PORT%   (no password)
echo   NATS        : localhost:%NATS_PORT%   monitor: http://localhost:%NATS_MON%
echo   MinIO API   : localhost:%MINIO_API%   console: http://localhost:%MINIO_CON%
echo   MinIO login : s3panda-wiki / s3panda-wiki-secret
echo ================================================================
pause
goto :eof

REM ======================== OPTION 2: Init DB ========================
:INITDB
echo.
where java >nul 2>&1
if errorlevel 1 (
    echo [ERROR] JDK 21 NOT installed. Download: https://adoptium.net/
    pause
    exit /b 1
)
echo [OK] JDK installed.
echo.
docker ps 2>nul | findstr "pandawiki-pg" >nul
if errorlevel 1 (
    echo [WARN] Middleware NOT running - starting middleware first.
    call :MID
    if errorlevel 1 exit /b 1
)
echo.
echo Running Flyway DB migrate (first run 1-3 min) ...
cd /d "%~dp0backend-java"
gradlew.bat flywayMigrate
if errorlevel 1 (
    echo [ERROR] flywayMigrate FAILED - see log above.
    pause
    exit /b 1
)
echo.
echo ================================================================
echo  [OK] Database initialized. Default admin:
echo    Login   : admin
echo    Password: admin123
echo ================================================================
pause
goto :eof

REM ======================== OPTION 3: Go Backend (DISABLED) ========================
:GO_DISABLED
echo.
echo ================================================================
echo  [INFO] Option 3 - Go Backend is DISABLED (temporarily not used).
echo         You have switched to Java Spring Boot backend.
echo         Backend port: 8080 (Java)  NOT  8000 (Go)
echo ================================================================
pause
goto :eof

REM ======================== OPTION 3 OLD CODE BELOW KEPT FOR REFERENCE ========================
REM Uncomment below lines if you ever want to switch BACK to Go backend:
REM :GO
REM where go >nul 2>&1
REM if errorlevel 1 ( echo [ERROR] Go NOT installed. & pause & exit /b 1 )
REM call :CHECKPORT %GO_API% Go-Backend-API
REM echo [OK] Starting Go backend (opens 2 new CMD windows - DO NOT CLOSE THEM)
REM timeout /t 2 >nul
REM cd /d "%~dp0backend"
REM set "E=set PG_DSN=%PG_DSN%& set REDIS_ADDR=%REDIS_ADDR%& set MQ_NATS_SERVER=%NATS_SRV%& set S3_ENDPOINT=%S3_EP%& set SENTRY_ENABLED=false"
REM start "PandaWiki Go API :%GO_API%" cmd /k title PandaWiki Go API :%GO_API% ^& %E% ^& echo [INFO] go run ./cmd/api/main.go starting ... ^& go run ./cmd/api/main.go
REM timeout /t 2 >nul
REM start "PandaWiki Go NATS Consumer" cmd /k title PandaWiki Go NATS Consumer ^& %E% ^& echo [INFO] go run ./cmd/consumer/main.go starting ... ^& go run ./cmd/consumer/main.go
REM pause
REM goto :eof

REM ======================== OPTION 4: Java Backend ========================
:JAVA
echo.
where java >nul 2>&1
if errorlevel 1 (
    echo [ERROR] JDK 21 NOT installed. Download: https://adoptium.net/
    pause
    exit /b 1
)
call :CHECKPORT %JAVA_API% Java-SpringBoot
echo Starting Spring Boot (first run downloads Gradle 1-5 min) ...

cd /d "%~dp0backend-java"

REM Set env vars HERE so the new window inherits them. Do NOT put unescaped "&" inside a variable that is later expanded on the same command line.
set "SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/panda-wiki"
set "SPRING_DATASOURCE_USERNAME=panda-wiki"
set "SPRING_DATASOURCE_PASSWORD=panda-wiki-secret"
set "SPRING_DATA_REDIS_HOST=localhost"
set "SPRING_DATA_REDIS_PORT=%REDIS_PORT%"
set "PANDAMQ_NATS_SERVER=%NATS_SRV%"

start "PandaWiki Java Spring Boot :%JAVA_API%" cmd /k title PandaWiki Java :%JAVA_API% ^& echo [INFO] gradlew.bat bootRun starting ... ^& gradlew.bat bootRun

echo.
echo ================================================================
echo  [OK] Java backend command sent.
echo     Wait for: "Started PandaWikiApplication" in new window.
echo     Health -> http://localhost:%JAVA_API%/ping
echo ================================================================
pause
goto :eof

REM ======================== OPTION 5: Admin Frontend ========================
:ADMIN
echo.
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js NOT installed. Download: https://nodejs.org/ ^(LTS 18+^)
    pause
    exit /b 1
)
where pnpm >nul 2>&1
if errorlevel 1 (
    echo [INFO] pnpm missing - installing via npm ...
    npm install -g pnpm
)
call :CHECKPORT %ADMIN% Admin-Frontend-Vite
cd /d "%~dp0web\admin"
if not exist "node_modules" (
    echo [INFO] First run: pnpm install (3-10 min, depends on network) ...
    pnpm install
    if errorlevel 1 ( echo [ERROR] pnpm install FAILED - see above. & pause & exit /b 1 )
)
echo Starting Vite admin frontend ...
set "TARGET=http://localhost:%JAVA_API%"
set "STATIC_FILE_TARGET=http://localhost:%JAVA_API%"
start "PandaWiki Admin :%ADMIN%" cmd /k title PandaWiki Admin :%ADMIN% ^& pnpm dev
echo.
echo ================================================================
echo  [OK] Admin frontend launched:
echo     Login URL : http://localhost:%ADMIN%/
echo     Login     : admin / admin123
echo     NOTE: /api proxies backend. Start Java backend first (option 4, port %JAVA_API%)!
echo ================================================================
pause
goto :eof

REM ======================== OPTION 6: App Frontend ========================
:APP
echo.
where pnpm >nul 2>&1
if errorlevel 1 ( echo [ERROR] pnpm/Node missing - run option 5 first. & pause & exit /b 1 )
call :CHECKPORT %APP% App-Frontend-NextJs
cd /d "%~dp0web\app"
if not exist "node_modules" (
    echo [INFO] First run: pnpm install ...
    pnpm install
    if errorlevel 1 ( echo [ERROR] pnpm install FAILED - see above. & pause & exit /b 1 )
)
echo Starting Next.js app frontend ...
set "TARGET=http://localhost:%JAVA_API%"
set "STATIC_FILE_TARGET=http://localhost:%JAVA_API%"
start "PandaWiki Wiki Frontend :%APP%" cmd /k title PandaWiki App :%APP% ^& pnpm dev
echo.
echo ================================================================
echo  [OK] App frontend launched:
echo     Wiki URL : http://localhost:%APP%/
echo     NOTE: Create a PUBLIC KB in Admin first, otherwise empty home.
echo ================================================================
pause
goto :eof

REM ======================== OPTION 7: START ALL ========================
:ALL
echo.
echo ================================================================
echo   ONE-CLICK FULL-STACK START (1 - 2 - 4 - 5 - 6)
echo   Backend = Java Spring Boot :8080 (Go 8000 DISABLED)
echo   First run 5-15 min. Subsequent runs ~1-2 min.
echo ================================================================
timeout /t 3 >nul
call :MID
if errorlevel 1 exit /b 1
timeout /t 3 >nul
call :INITDB
if errorlevel 1 exit /b 1
timeout /t 3 >nul
call :JAVA
if errorlevel 1 exit /b 1
timeout /t 5 >nul
call :ADMIN
if errorlevel 1 exit /b 1
timeout /t 3 >nul
call :APP
if errorlevel 1 exit /b 1
echo.
echo.
echo ================================================================
echo     FULL-STACK START COMMANDS SENT! (Java Backend + 2 Frontends)
echo ================================================================
echo.
echo   Admin login  : http://localhost:5173/   (admin / admin123)
echo   Wiki front   : http://localhost:3010/
echo   Java health  : http://localhost:8080/ping
echo   MinIO console: http://localhost:9001/   (s3panda-wiki / s3panda-wiki-secret)
echo.
pause
goto EXIT

REM ======================== OPTION 8: STATUS ========================
:STATUS
cls
echo.
echo ================================================================
echo                 PandaWiki Running Status
echo ================================================================
echo.
echo [Docker Compose Containers]
cd /d "%~dp0"
where docker >nul 2>&1
if errorlevel 1 (
    echo   [ERROR] Docker NOT installed or NOT running.
    echo   -> Open Docker Desktop first ^(wait whale icon GREEN^).
) else (
    docker compose ps
)
echo.
echo [Local Port LISTENING]:
call :SCANPORT 5432 PostgreSQL
call :SCANPORT 6380 Redis_PandaWiki_6380
call :SCANPORT 4222 NATS
call :SCANPORT 8222 NATS_Monitor
call :SCANPORT 9000 MinIO_API
call :SCANPORT 9001 MinIO_Console
call :SCANPORT 8000 Go_Backend_API
call :SCANPORT 8080 Java_Backend_API
call :SCANPORT 5173 Admin_Frontend
call :SCANPORT 3000 App_Frontend
echo.
echo [Quick URLs]:
echo   Admin login  : http://localhost:5173/   admin/admin123
echo   Wiki front   : http://localhost:3010/
echo   Go health    : http://localhost:8000/ping   (pong = OK)
echo   Java health  : http://localhost:8080/ping
echo   NATS monitor : http://localhost:8222/
echo   MinIO console: http://localhost:9001/   s3panda-wiki/s3panda-wiki-secret
echo.
pause
goto :eof

:EXIT
echo.
echo Goodbye. Next time just DOUBLE-CLICK this file (start.cmd).
echo Stop services -> double-click stop.cmd.  See status -> double-click status.cmd.
timeout /t 3 >nul
endlocal
exit /b 0
