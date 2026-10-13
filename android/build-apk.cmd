@echo off
rem Compila el APK de depuracion de Carga. Uso: build-apk.cmd (desde la carpeta android)
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
pushd "%~dp0"
call "%~dp0gradlew.bat" assembleDebug --no-daemon
if errorlevel 1 (
  echo La compilacion fallo.
) else (
  echo APK listo: %~dp0app\build\outputs\apk\debug\app-debug.apk
)
popd
