import 'package:flutter/foundation.dart';

/// Point to your API (through Nginx in production).
///
/// Overrides: `--dart-define=API_BASE=...` and `--dart-define=WS_BASE=...`.
/// When unset: **web/desktop** uses `localhost`; **mobile** defaults to the
/// Android emulator loopback (`10.0.2.2`).
abstract final class ApiConfig {
  static String get restBase {
    const fromEnv = String.fromEnvironment('API_BASE');
    if (fromEnv.isNotEmpty) return fromEnv;
    final host = (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
        ? 'http://10.0.2.2:4000'
        : 'http://localhost:4000';
    return '$host/api/v1';
  }

  static String get socketBase {
    const fromEnv = String.fromEnvironment('WS_BASE');
    if (fromEnv.isNotEmpty) return fromEnv;
    return (!kIsWeb && defaultTargetPlatform == TargetPlatform.android)
        ? 'http://10.0.2.2:4000'
        : 'http://localhost:4000';
  }
}
