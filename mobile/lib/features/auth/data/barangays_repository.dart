import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/isabela_seed_barangays.dart';
import '../../../core/network/dio_provider.dart';

final barangaysRepositoryProvider = Provider<BarangaysRepository>((ref) {
  return BarangaysRepository(ref.watch(dioProvider));
});

/// Isabela City barangays for forms — no JWT (`GET /barangays/public`).
final class PublicBarangay {
  const PublicBarangay({required this.id, required this.name, required this.code});

  final String id;
  final String name;
  final String code;

  factory PublicBarangay.fromJson(Map<String, dynamic> j) {
    return PublicBarangay(
      id: j['id']?.toString() ?? '',
      name: j['name']?.toString() ?? '',
      code: j['code']?.toString() ?? '',
    );
  }
}

/// Offline list when the API is empty or unreachable (`id` == seed `code` until server returns CUIDs).
List<PublicBarangay> isabelaOfflineBarangays() {
  return kIsabelaSeedBarangayPairs
      .map((e) => PublicBarangay(id: e.$1, name: e.$2, code: e.$1))
      .toList(growable: false);
}

bool looksLikeSeedBarangayCode(String? s) {
  if (s == null || s.isEmpty) return false;
  return RegExp(r'^IC-\d{3}$', caseSensitive: false).hasMatch(s.trim());
}

/// `POST /auth/register` — never send both keys.
Map<String, String> barangayRegisterFields(String? selection) {
  final v = selection?.trim();
  if (v == null || v.isEmpty) return {};
  if (looksLikeSeedBarangayCode(v)) {
    return {'barangayCode': v.toUpperCase()};
  }
  return {'barangayId': v};
}

/// `PATCH /users/me` — never send both keys.
Map<String, String> barangayProfilePatchFields(String? selection) {
  final v = selection?.trim();
  if (v == null || v.isEmpty) return {};
  if (looksLikeSeedBarangayCode(v)) {
    return {'barangayCode': v.toUpperCase()};
  }
  return {'barangayId': v};
}

final class BarangaysRepository {
  BarangaysRepository(this._dio);

  final Dio _dio;

  List<PublicBarangay> _parseBarangayRows(dynamic data) {
    final List<dynamic> list = _unwrapList(data);
    final out = <PublicBarangay>[];
    for (final raw in list) {
      if (raw is Map<String, dynamic>) {
        final b = PublicBarangay.fromJson(raw);
        if (b.id.isNotEmpty && b.name.isNotEmpty) out.add(b);
      } else if (raw is Map) {
        final b = PublicBarangay.fromJson(Map<String, dynamic>.from(raw));
        if (b.id.isNotEmpty && b.name.isNotEmpty) out.add(b);
      }
    }
    return out;
  }

  /// Signed-in flows (profile, etc.): prefer `GET /barangays` so `<select>` values are DB UUIDs.
  /// Sending seed `IC-xxx` as [barangayCode] returns 409 if that deployment never seeded those codes.
  Future<List<PublicBarangay>> fetchPreferringAuthSession() async {
    try {
      final res = await _dio.get<dynamic>('/barangays');
      final out = _parseBarangayRows(res.data);
      if (out.isNotEmpty) return out;
    } catch (_) {
      /* no token, 401, or empty */
    }
    return fetchPublic();
  }

  Future<List<PublicBarangay>> fetchPublic() async {
    try {
      final res = await _dio.get<dynamic>('/barangays/public');
      final out = _parseBarangayRows(res.data);
      if (out.isNotEmpty) return out;
    } catch (_) {
      /* use seed list */
    }
    return isabelaOfflineBarangays();
  }

  /// Nest returns a raw JSON array; tolerate `{ "data": [...] }` if a wrapper is added later.
  static List<dynamic> _unwrapList(dynamic data) {
    if (data is List<dynamic>) return data;
    if (data is List) return List<dynamic>.from(data);
    if (data is Map<String, dynamic>) {
      final inner = data['data'];
      if (inner is List<dynamic>) return inner;
      if (inner is List) return List<dynamic>.from(inner);
    }
    if (data is Map) {
      final inner = data['data'];
      if (inner is List) return List<dynamic>.from(inner);
    }
    return const [];
  }
}
