@echo off
rem Instala el SDK de Android (command-line tools, platform-tools, plataforma 36, build-tools 36) en %LOCALAPPDATA%\Android\Sdk
setlocal
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "SDK=%LOCALAPPDATA%\Android\Sdk"
set "URL=https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip"
if not exist "%SDK%\cmdline-tools\latest\bin\sdkmanager.bat" (
  echo Descargando command-line tools...
  mkdir "%SDK%\cmdline-tools" 2>nul
  curl -L -o "%TEMP%\cmdtools.zip" "%URL%" || goto :error
  tar -xf "%TEMP%\cmdtools.zip" -C "%SDK%\cmdline-tools" || goto :error
  if exist "%SDK%\cmdline-tools\latest" rmdir /s /q "%SDK%\cmdline-tools\latest"
  move "%SDK%\cmdline-tools\cmdline-tools" "%SDK%\cmdline-tools\latest" >nul || goto :error
  del "%TEMP%\cmdtools.zip"
)
set "LIB=%SDK%\cmdline-tools\latest\lib"
echo Aceptando licencias...
(for /l %%i in (1,1,30) do @echo y) | "%JAVA_HOME%\bin\java.exe" -cp "%LIB%\*" com.android.sdklib.tool.sdkmanager.SdkManagerCli --sdk_root="%SDK%" --licenses >nul 2>&1
echo Instalando paquetes...
"%JAVA_HOME%\bin\java.exe" -cp "%LIB%\*" com.android.sdklib.tool.sdkmanager.SdkManagerCli --sdk_root="%SDK%" "platform-tools" "platforms;android-36" "build-tools;36.0.0" || goto :error
echo SDK listo en %SDK%
dir "%SDK%"
exit /b 0
:error
echo Fallo la instalacion del SDK.
exit /b 1
