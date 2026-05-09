import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/storage/token_storage.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), ref.watch(tokenStorageProvider));
});

final class AuthRepository {
  AuthRepository(this._dio, this._tokens);

  final Dio _dio;
  final TokenStorage _tokens;

  Future<void> register({
    required String email,
    required String password,
    required String fullName,
    required String phone,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: {'email': email, 'password': password, 'fullName': fullName, 'phone': phone},
    );
    final data = res.data;
    final access = data?['accessToken'] as String?;
    final refresh = data?['refreshToken'] as String?;
    if (access == null || refresh == null) {
      throw StateError('Invalid register response');
    }
    await _tokens.saveSession(access: access, refresh: refresh);
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    final data = res.data;
    final access = data?['accessToken'] as String?;
    final refresh = data?['refreshToken'] as String?;
    if (access == null || refresh == null) {
      throw StateError('Invalid login response');
    }
    await _tokens.saveSession(access: access, refresh: refresh);
  }

  Future<void> logout() => _tokens.clearSession();

  Future<bool> restoreSession() async {
    final (a, _) = await _tokens.loadTokens();
    return a != null && a.isNotEmpty;
  }
}
