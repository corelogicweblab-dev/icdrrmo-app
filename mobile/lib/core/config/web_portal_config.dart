import 'package:flutter/foundation.dart';

/// Admin / ops web app URL (Firebase Hosting or custom domain).
///
/// Overrides: `--dart-define=ICDRRMO_WEB_URL=https://your-host` (no trailing slash).
/// Release builds without an override use the production Hosting site for this project.
class WebPortalConfig {
  WebPortalConfig._();

  /// Matches Firebase project `icdrrmo-b204e` default Hosting URL; override for staging or custom domain.
  static const String _defaultProductionHosting = 'https://icdrrmo-b204e.web.app';

  static String get resolvedAdminWebBase {
    const fromEnv = String.fromEnvironment('ICDRRMO_WEB_URL');
    final trimmed = fromEnv.trim();
    if (trimmed.isNotEmpty) return trimmed;
    if (kReleaseMode) return _defaultProductionHosting;
    return '';
  }

  static bool get hasAdminWeb => resolvedAdminWebBase.isNotEmpty;

  static Uri? responderSignInUri() => _signIn('/signin/responder');

  static Uri? operatorSignInUri() => _signIn('/signin/operator');

  static Uri? _signIn(String path) {
    final b = resolvedAdminWebBase;
    if (b.isEmpty) return null;
    final base = b.endsWith('/') ? b.substring(0, b.length - 1) : b;
    return Uri.parse('$base$path');
  }
}
