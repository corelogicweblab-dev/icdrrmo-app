import 'package:firebase_core/firebase_core.dart';

/// Web/mobile client config from `--dart-define=...` (matches Firebase Console → Project settings).
///
/// Example (Android run):
/// `flutter run --dart-define=FIREBASE_PROJECT_ID=icdrrmo-b204e --dart-define=FIREBASE_WEB_API_KEY=...`
abstract final class FirebaseEnv {
  static const String projectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const String apiKey = String.fromEnvironment('FIREBASE_WEB_API_KEY');
  static const String appId = String.fromEnvironment('FIREBASE_APP_ID');
  static const String messagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const String authDomain = String.fromEnvironment('FIREBASE_AUTH_DOMAIN');

  static FirebaseOptions get options {
    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      authDomain: authDomain.isEmpty ? '$projectId.firebaseapp.com' : authDomain,
    );
  }
}
