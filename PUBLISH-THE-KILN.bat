@echo off
setlocal enabledelayedexpansion
title THE KILN - publish
cd /d "%~dp0"

set OWNER=kylefriesmarketing
set REPO=the-kiln
set URL=https://%OWNER%.github.io/%REPO%/

echo(
echo   THE KILN  --^>  %URL%
echo   ============================================================
echo(

where git >nul 2>&1 || (echo   [x] git is not on PATH. & goto :done)

set GH=gh
where gh >nul 2>&1 || set "GH=C:\Users\kylef\tools\gh\bin\gh.exe"
if /i not "%GH%"=="gh" if not exist "%GH%" (
  echo   [x] GitHub CLI not found at %GH%
  echo       Get it from https://cli.github.com/ then run this again.
  goto :done
)

REM --- clear the locks and temp objects the cloud sandbox could not delete ---
del /q ".git\index.lock" >nul 2>&1
del /q ".git\HEAD.lock" >nul 2>&1
del /q ".git\*.lock" >nul 2>&1
for /d %%D in (.git\objects\??) do del /q "%%D\tmp_obj_*" >nul 2>&1

REM --- log in if needed ---
"%GH%" auth status >nul 2>&1
if errorlevel 1 (
  echo   Not logged into GitHub yet - a browser window will open.
  echo(
  "%GH%" auth login --web --git-protocol https
  if errorlevel 1 (echo   [x] login did not finish. Run this again after it does. & goto :done)
)
"%GH%" auth setup-git >nul 2>&1

REM --- commit whatever changed ---
git add -A >nul 2>&1
git diff --cached --quiet
if errorlevel 1 (
  git commit -q -m "THE KILN update"
  echo   [+] committed
) else (
  echo   [=] nothing new to commit
)

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  REM first publish - make the single commit carry the right name
  for /f %%C in ('git rev-list --count HEAD 2^>nul') do set NC=%%C
  if "!NC!"=="1" git commit -q --amend -m "THE KILN - a gas reduction firing. one night, nine people, one kiln."
  echo   [+] creating %OWNER%/%REPO% ...
  "%GH%" repo create %OWNER%/%REPO% --public --source=. --remote=origin --push --description "THE KILN - a gas reduction firing you steer blind, then open. a Dirty Boy Devs game."
  if errorlevel 1 (
    echo   [!] create failed - trying it as an existing repo instead
    git remote add origin https://github.com/%OWNER%/%REPO%.git 2>nul
    git branch -M main
    git push -u origin main || (echo   [x] push failed - read the message above. & goto :done)
  )
) else (
  echo   [+] pushing ...
  git push -u origin main || (echo   [x] push failed - read the message above. & goto :done)
)

echo   [+] switching GitHub Pages on ...
"%GH%" api --method POST /repos/%OWNER%/%REPO%/pages -f "source[branch]=main" -f "source[path]=/" >nul 2>&1
if errorlevel 1 "%GH%" api --method PUT /repos/%OWNER%/%REPO%/pages -f "source[branch]=main" -f "source[path]=/" >nul 2>&1

echo(
echo   ============================================================
echo   PUSHED.   %URL%
echo(
echo   Pages takes about 60 seconds to build the FIRST time.
echo   If you get a 404, wait a minute and refresh - that is normal.
echo(
echo   Run this file again any time to update the same link.
echo   ============================================================
echo(
timeout /t 45 >nul
start "" "%URL%"

:done
echo(
pause
