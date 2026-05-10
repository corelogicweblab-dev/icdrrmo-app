# Citizen app → Firestore (real client reads)

## Flow

1. User signs in with **Nest** (`POST /auth/login`) → store JWT (existing).
2. App calls **`POST /auth/firebase-custom-token`** with `Authorization: Bearer <JWT>`.
3. API returns **`{ customToken }`** (Firebase Auth custom token, `uid` = PostgreSQL `users.id`).
4. App runs **`signInWithCustomToken(customToken)`** then reads **`citizen_profiles/{uid}`** in Firestore.

Writes to that document stay **server-side only** (Nest mirrors Postgres → Firestore) so data does not fork. Edit profile still goes through your REST API (`PATCH /users/me`).

## API (Render / Nest)

Set on the backend:

- `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

Deploy Firestore rules (`infra/firebase/firestore.rules`) so `citizen_profiles` allows **read** when `request.auth.uid == userId`.

## Flutter `--dart-define`

From Firebase Console → Project settings → Your apps → Web (or use the same keys for mobile client):

```text
--dart-define=FIREBASE_PROJECT_ID=your_project_id
--dart-define=FIREBASE_WEB_API_KEY=...
--dart-define=FIREBASE_APP_ID=1:...:android:... or 1:...:web:...
--dart-define=FIREBASE_MESSAGING_SENDER_ID=...
--dart-define=FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
```

**Android:** add `google-services.json` from Firebase Console to `android/app/` (Firebase Flutter setup).

**iOS:** add `GoogleService-Info.plist` to `ios/Runner/`.

Then:

```bash
flutter pub get
flutter run --dart-define=FIREBASE_PROJECT_ID=...
```

If `FIREBASE_PROJECT_ID` is empty, the app skips Firebase (local profile only).
