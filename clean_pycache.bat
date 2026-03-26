@echo off
REM Clean Python cache files (__pycache__ directories and .pyc files)
REM Usage: clean_pycache.bat [--dry-run] [directory]

setlocal enabledelayedexpansion

set "TARGET_DIR=%~dp0.."
set "DRY_RUN=false"

REM Parse arguments
:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="--dry-run" (
    set "DRY_RUN=true"
    shift
    goto :parse_args
)
if not "%~1"=="" (
    set "TARGET_DIR=%~1"
    shift
    goto :parse_args
)
:end_parse

echo 🔍 Cleaning Python cache files in: %TARGET_DIR%

if "%DRY_RUN%"=="true" (
    echo 🔍 DRY RUN MODE - No files will be deleted
    echo.
)

REM Count and delete __pycache__ directories
set "DELETED_DIRS=0"
for /r "%TARGET_DIR%" /d %%d in (__pycache__) do (
    if not "%%d"=="" (
        if not "%%d"=="*venv*" if not "%%d"=="*.venv*" if not "%%d"=="*env*" if not "%%d"=="*.env*" if not "%%d"=="*node_modules*" if not "%%d"=="*.git*" (
            if "%DRY_RUN%"=="true" (
                echo    [DRY RUN] Would delete: %%d
            ) else (
                rd /s /q "%%d" 2>nul
                if !errorlevel!==0 set /a DELETED_DIRS+=1
            )
        )
    )
)

REM Count and delete .pyc and .pyo files
set "DELETED_FILES=0"
for /r "%TARGET_DIR%" %%f in (*.pyc *.pyo) do (
    if not "%%f"=="" (
        echo %%f | findstr /i /c:"venv" /c:".venv" /c:"env" /c:".env" /c:"node_modules" /c:".git" >nul
        if !errorlevel! neq 0 (
            if "%DRY_RUN%"=="true" (
                echo    [DRY RUN] Would delete: %%f
            ) else (
                del /f /q "%%f" 2>nul
                if !errorlevel!==0 set /a DELETED_FILES+=1
            )
        )
    )
)

REM Summary
echo.
if "%DRY_RUN%"=="true" (
    echo ✅ DRY RUN COMPLETE
) else (
    echo ✅ CLEANUP COMPLETE
    echo    Deleted !DELETED_DIRS! __pycache__ directories
    echo    Deleted !DELETED_FILES! .pyc/.pyo files
)

endlocal

