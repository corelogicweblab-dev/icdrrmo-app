import 'dart:convert';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/models/emergency_type.dart';

/// Persist failed SOS payloads; background sync retries (minimal engine).
Future<void> enqueueOfflineSos({
  required EmergencyTypeApi type,
  required double latitude,
  required double longitude,
  required int battery,
  required int signalPct,
  String? userId,
}) async {
  final store = gCitizenStore;
  if (store == null) return;
  final list = store.pendingSosList()
    ..add({
      'type': type.wireValue,
      'latitude': latitude,
      'longitude': longitude,
      'batteryLevel': battery,
      'signalStrength': signalPct,
      'userId': userId,
      'createdAtMs': DateTime.now().millisecondsSinceEpoch,
    });
  await store.setPendingSosList(list);
}

/// Pop and return next job (FIFO).
Future<Map<String, dynamic>?> dequeueOfflineHead() async {
  final store = gCitizenStore;
  if (store == null) return null;
  final list = store.pendingSosList();
  if (list.isEmpty) return null;
  final head = list.removeAt(0);
  await store.setPendingSosList(list);
  return head;
}

Future<int> offlineQueueDepth() async {
  final store = gCitizenStore;
  if (store == null) return 0;
  return store.pendingSosList().length;
}

String buildSmsFallbackPacket({
  required String userId,
  required double lat,
  required double lng,
  required EmergencyTypeApi type,
  required int battery,
}) {
  final ts = DateTime.now().toUtc().millisecondsSinceEpoch;
  return 'SOS|$userId|$lat|$lng|${type.wireValue}|$battery|$ts';
}

Map<String, dynamic>? parseSmsPacket(String body) {
  final parts = body.trim().split('|');
  if (parts.length < 7 || parts[0] != 'SOS') return null;
  return {
    'userId': parts[1],
    'lat': double.tryParse(parts[2]),
    'lng': double.tryParse(parts[3]),
    'type': parts[4],
    'battery': int.tryParse(parts[5]),
    'ts': int.tryParse(parts[6]),
  };
}

String offlineQueueDebugJson() {
  final store = gCitizenStore;
  if (store == null) return '[]';
  return const JsonEncoder.withIndent('  ').convert(store.pendingSosList());
}
