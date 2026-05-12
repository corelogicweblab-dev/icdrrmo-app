# ICDRRMO Mobile (Flutter)

Citizen application stack: Riverpod, Dio, Socket.IO client, Hive, GPS, and SMS-related packages are declared in `pubspec.yaml`.

## Generate project (optional)

If you prefer a full `flutter create` tree, run:

```bash
flutter create --org ph.gov.isabela.icdrrmo --project-name icdrrmo_mobile .
```

Then merge `lib/` from this repo.

## Branding

Official mark: **`icdrrmologo.png`** (same file as repo root). Flutter loads it from `assets/images/icdrrmologo.png` (splash, login, register). After `flutter create`, copy the repo’s `icdrrmologo.png` into `assets/images/` or run from repo where it already exists.

For **launcher icons** on Android/iOS, replace the default mipmaps / `AppIcon.appiconset` with exports derived from `icdrrmologo.png` (e.g. [appicon.co](https://www.appicon.co) or Flutter’s `flutter_launcher_icons`).

## Run

```bash
flutter pub get
flutter run
```

Defaults: **Android emulator** uses host API at `http://10.0.2.2:4000`; **web / iOS simulator / desktop** use `http://localhost:4000`. Override anytime:

```bash
flutter run --dart-define=API_BASE=http://10.0.2.2:4000/api/v1 --dart-define=WS_BASE=http://10.0.2.2:4000
```

`10.0.2.2` is the Android emulator’s alias for your development machine.

## Citizen flow implemented in `lib/`

Splash connectivity + server readiness → onboarding (GPS **required**) → JWT auth → emergency medical profile wizard → bottom-nav shell **Home · Incidents · Map · Alerts · Profile** → giant SOS (API + Hive offline queue + SMS packet) → realtime tracking (`/realtime` socket).

### Android / iOS scaffolding

Platform folders (`android/`, `ios/`) are not tracked here. Generate them with:

```bash
cd mobile
flutter create --org ph.gov.icdrrmo --project-name icdrrmo_mobile .
```

Merge `lib/` and `pubspec.yaml` afterward. Configure **location**, **notifications**, **SMS**, and optionally **foreground service / background location** permissions in native manifests (`ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `POST_NOTIFICATIONS`, `READ_SMS`/`SEND_SMS`).

**Screen rotation (follow system lock):** In `android/app/src/main/AndroidManifest.xml`, on the `MainActivity` `<activity>` element set `android:screenOrientation="fullUser"` (API 18+). Avoid `sensor`, `fullSensor`, or `landscape` there — those ignore the user’s portrait/rotation lock. The app’s `main.dart` clears any Dart-side orientation overrides so the OS policy wins.

### Releases

After `flutter build apk` / `flutter build appbundle` / Xcode archive, attach Play/App Store listings and ICDRRMO signing keys privately.
