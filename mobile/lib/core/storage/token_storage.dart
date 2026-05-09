import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// JWT access + refresh — Flutter Secure Storage (Keychain / Keystore).
final class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _s = storage ?? const FlutterSecureStorage();

  static const _access = 'icd_access_token';
  static const _refresh = 'icd_refresh_token';
  static const _deviceBound = 'icd_device_id';

  final FlutterSecureStorage _s;

  Future<void> saveSession({required String access, required String refresh}) async {
    await _s.write(key: _access, value: access);
    await _s.write(key: _refresh, value: refresh);
  }

  Future<(String?, String?)> loadTokens() async {
    final a = await _s.read(key: _access);
    final r = await _s.read(key: _refresh);
    return (a, r);
  }

  Future<void> clearSession() async {
    await _s.delete(key: _access);
    await _s.delete(key: _refresh);
  }

  Future<String?> readDeviceId() => _s.read(key: _deviceBound);

  Future<void> setDeviceId(String id) => _s.write(key: _deviceBound, value: id);
}
