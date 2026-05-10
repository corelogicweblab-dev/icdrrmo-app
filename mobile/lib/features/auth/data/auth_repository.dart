import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firestore/citizen_firestore_sync.dart';
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
    String? barangayId,
    String? streetPurok,
  }) async {
    final body = <String, dynamic>{
      'email': email,
      'password': password,
      'fullName': fullName,
      'phone': phone,
    };
    if (barangayId != null && barangayId.isNotEmpty) {
      body['barangayId'] = barangayId;
    }
    final sp = streetPurok?.trim();
    if (sp != null && sp.isNotEmpty) {
      body['streetPurok'] = sp;
    }
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/register',
      data: body,
    );
    final data = res.data;
    final access = data?['accessToken'] as String?;
    if (access == null) {
      throw StateError('Invalid register response');
    }
    final refresh = data?['refreshToken'] as String?;
    await _tokens.saveSession(access: access, refresh: refresh);
    await CitizenFirestoreSync.signInWithBackend(_dio);
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
    if (access == null) {
      throw StateError('Invalid login response');
    }
    final refresh = data?['refreshToken'] as String?;
    await _tokens.saveSession(access: access, refresh: refresh);
    await CitizenFirestoreSync.signInWithBackend(_dio);
  }

  Future<void> logout() async {
    await CitizenFirestoreSync.signOut();
    await _tokens.clearSession();
  }

  /// After cold start with stored Nest JWT, attach Firebase session for Firestore reads.
  Future<void> syncFirebaseAfterRestore() => CitizenFirestoreSync.signInWithBackend(_dio);

  Future<bool> restoreSession() async {
    final (a, _) = await _tokens.loadTokens();
    return a != null && a.isNotEmpty;
  }
}
