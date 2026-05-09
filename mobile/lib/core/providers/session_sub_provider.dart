import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/jwt_decode.dart';
import '../network/dio_provider.dart';

/// Resolved `sub` from secure-stored JWT (best-effort, display / SMS envelope).
final jwtSubProvider = FutureProvider<String?>((ref) async {
  final storage = ref.watch(tokenStorageProvider);
  final (access, _) = await storage.loadTokens();
  return jwtSub(access);
});
