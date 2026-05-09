# ICDRRMO Mobile (Flutter)

Citizen application stack: Riverpod, Dio, Socket.IO client, Hive, GPS, and SMS-related packages are declared in `pubspec.yaml`.

## Generate project (optional)

If you prefer a full `flutter create` tree, run:

```bash
flutter create --org ph.gov.isabela.icdrrmo --project-name icdrrmo_mobile .
```

Then merge `lib/` from this repo.

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

### Releases

After `flutter build apk` / `flutter build appbundle` / Xcode archive, attach Play/App Store listings and ICDRRMO signing keys privately.
