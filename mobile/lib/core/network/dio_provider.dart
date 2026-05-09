import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/api_config.dart';
import '../storage/token_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  final d = Dio(
    BaseOptions(
      baseUrl: ApiConfig.restBase,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 25),
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
    ),
  );

  d.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final (access, _) = await storage.loadTokens();
        if (access != null && access.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $access';
        }
        return handler.next(options);
      },
    ),
  );

  return d;
});
