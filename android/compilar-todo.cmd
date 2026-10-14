@echo off
rem Instala el SDK si falta y compila el APK de depuracion.
call "%~dp0instalar-sdk.cmd" || exit /b 1
call "%~dp0build-apk.cmd"
