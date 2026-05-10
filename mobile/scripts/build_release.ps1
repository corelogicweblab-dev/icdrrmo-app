# Production APK — point API_* at your Nest deployment; ICDRRMO_WEB_URL matches Firebase Hosting admin SPA.
# Example:
#   .\scripts\build_release.ps1
param(
  [string]$ApiBase = "",
  [string]$WsBase = "",
  [string]$WebUrl = "https://icdrrmo-b204e.web.app"
)

$defines = @("--dart-define=ICDRRMO_WEB_URL=$WebUrl")
if ($ApiBase) { $defines += "--dart-define=API_BASE=$ApiBase" }
if ($WsBase) { $defines += "--dart-define=WS_BASE=$WsBase" }

flutter build apk --release @defines
