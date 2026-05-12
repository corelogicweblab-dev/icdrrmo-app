import 'dart:convert';

Map<String, dynamic>? decodeJwtPayload(String jwt) {
  try {
    final parts = jwt.split('.');
    if (parts.length < 2) return null;
    var payload = parts[1];
    final mod = payload.length % 4;
    if (mod != 0) {
      payload += '=' * (4 - mod);
    }
    payload = payload.replaceAll('-', '+').replaceAll('_', '/');
    final jsonStr = utf8.decode(base64.decode(payload));
    return jsonDecode(jsonStr) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}

String? jwtSub(String? jwt) {
  if (jwt == null || jwt.isEmpty) return null;
  return decodeJwtPayload(jwt)?['sub'] as String?;
}

String? jwtRole(String? jwt) {
  if (jwt == null || jwt.isEmpty) return null;
  final r = decodeJwtPayload(jwt)?['role'];
  return r is String ? r : null;
}
