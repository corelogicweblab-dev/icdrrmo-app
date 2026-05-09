import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/emergency_type.dart';
import '../../../core/network/dio_provider.dart';

final sosRepositoryProvider = Provider<SosRepository>((ref) {
  return SosRepository(ref.watch(dioProvider));
});

final class SosRepository {
  SosRepository(this._dio);

  final Dio _dio;

  /// POST /incidents/sos — returns incidentId.
  Future<String> submitSos({
    required EmergencyTypeApi type,
    required double latitude,
    required double longitude,
    int? batteryLevel,
    int? signalStrength,
    String? description,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/incidents/sos',
      data: {
        'type': type.wireValue,
        'latitude': latitude,
        'longitude': longitude,
        if (batteryLevel != null) 'batteryLevel': batteryLevel,
        if (signalStrength != null) 'signalStrength': signalStrength,
        if (description != null && description.isNotEmpty) 'description': description,
      },
    );
    final id = res.data?['incidentId'] as String?;
    if (id == null || id.isEmpty) throw StateError('Missing incidentId');
    return id;
  }
}
