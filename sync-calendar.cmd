@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "URL_FILE=%~dp0apps-script-web-app-url.txt"

if exist "%URL_FILE%" (
  set /p "WEB_APP_URL="<"%URL_FILE%"
)

if not defined WEB_APP_URL (
  echo First-time setup: paste the Apps Script web app /exec URL.
  set /p "WEB_APP_URL=Web app URL: "
  if not defined WEB_APP_URL (
    echo No URL was entered.
    pause
    exit /b 1
  )
  >"%URL_FILE%" echo !WEB_APP_URL!
)

start "" "!WEB_APP_URL!"
endlocal
