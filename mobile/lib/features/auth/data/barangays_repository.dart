import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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

final class BarangaysRepository {
  BarangaysRepository(this._dio);

  final Dio _dio;

  Future<List<PublicBarangay>> fetchPublic() async {
    final res = await _dio.get<dynamic>('/barangays/public');
    final data = res.data;
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
