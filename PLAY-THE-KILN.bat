@echo off
title THE KILN
cd /d "%~dp0"
set NODE=C:\Users\kylef\tools\node\node.exe
if not exist "%NODE%" set NODE=node
start "" http://localhost:8461
"%NODE%" serve.mjs
