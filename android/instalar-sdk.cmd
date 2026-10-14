@echo off
rem Instala el SDK de Android (command-line tools, platform-tools, plataforma 36, build-tools 36) en %LOCALAPPDATA%\Android\Sdk
setlocal
set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "SDK=%LOCALAPPDATA%\Android\Sdk"
set "URL=https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip"
if exist "%SDK%\platforms\android-36" if exist "%SDK%\build-tools\36.0.0" (
  echo SDK ya instalado en %SDK%
  exit /b 0
)
if not exist "%SDK%\cmdline-tools\latest\lib" (
  echo Descargando command-line tools...
  mkdir "%SDK%\cmdline-tools" 2>nul
  curl -sL -o "%TEMP%\cmdtools.zip" "%URL%" || goto :error
  tar -xf "%TEMP%\cmdtools.zip" -C "%SDK%\cmdline-tools" || goto :error
  if exist "%SDK%\cmdline-tools\latest" rmdir /s /q "%SDK%\cmdline-tools\latest"
  move "%SDK%\cmdline-tools\cmdline-tools" "%SDK%\cmdline-tools\latest" >nul || goto :error
  del "%TEMP%\cmdtools.zip"
)
rem Licencia del SDK de Android aceptada por el usuario (hash oficial de android-sdk-license)
mkdir "%SDK%\licenses" 2>nul
> "%SDK%\licenses\android-sdk-license" echo 24333f8a63b6825ea9c5514f83c2829b004d1fee
set "LIB=%SDK%\cmdline-tools\latest\lib"
echo Instalando paquetes (unos minutos)...
"%JAVA_HOME%\bin\java.exe" -cp "%LIB%\*" com.android.sdklib.tool.sdkmanager.SdkManagerCli --sdk_root="%SDK%" "platform-tools" "platforms;android-36" "build-tools;36.0.0" < nul || goto :error
if not exist "%SDK%\platforms\android-36" goto :error
echo SDK listo en %SDK%
exit /b 0
:error
echo Fallo la instalacion del SDK.
exit /b 1
