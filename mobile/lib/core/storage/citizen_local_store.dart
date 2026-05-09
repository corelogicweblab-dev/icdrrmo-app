import 'dart:convert';

import 'package:hive_flutter/hive_flutter.dart';

/// Hive flags + JSON profile + offline SOS queue (no codegen — Map dynamic).
final class CitizenLocalStore {
  CitizenLocalStore(this._box);

  final Box<dynamic> _box;

  static const boxName = 'citizen_local_v1';

  static Future<CitizenLocalStore> open() async {
    final b = await Hive.openBox<dynamic>(boxName);
    return CitizenLocalStore(b);
  }

  bool get onboardingDone => _box.get('onboarding_done', defaultValue: false) == true;
  set onboardingDone(bool v) => _box.put('onboarding_done', v);

  bool get profileComplete => _box.get('profile_complete', defaultValue: false) == true;
  set profileComplete(bool v) => _box.put('profile_complete', v);

  bool get notificationsEnabledFlag => _box.get('notif_flag', defaultValue: false) == true;
  set notificationsEnabledFlag(bool v) => _box.put('notif_flag', v);

  bool get smsPermissionFlag => _box.get('sms_flag', defaultValue: false) == true;
  set smsPermissionFlag(bool v) => _box.put('sms_flag', v);

  bool get backgroundLocationFlag => _box.get('bg_loc_flag', defaultValue: false) == true;
  set backgroundLocationFlag(bool v) => _box.put('bg_loc_flag', v);

  bool get lowBandwidthMode => _box.get('low_bw', defaultValue: false) == true;
  set lowBandwidthMode(bool v) => _box.put('low_bw', v);

  bool get largeText => _box.get('a11y_large_text', defaultValue: false) == true;
  set largeText(bool v) => _box.put('a11y_large_text', v);

  bool get seniorMode => _box.get('a11y_senior', defaultValue: false) == true;
  set seniorMode(bool v) => _box.put('a11y_senior', v);

  bool get colorBlindSafe => _box.get('a11y_color_blind', defaultValue: false) == true;
  set colorBlindSafe(bool v) => _box.put('a11y_color_blind', v);

  Map<String, dynamic> profileMap() {
    final raw = _box.get('profile_json');
    if (raw is String && raw.isNotEmpty) {
      try {
        final m = jsonDecode(raw) as Map<String, dynamic>?;
        return m ?? {};
      } catch (_) {}
    }
    return {};
  }

  Future<void> saveProfileMap(Map<String, dynamic> map) async {
    await _box.put('profile_json', jsonEncode(map));
  }

  List<Map<String, dynamic>> pendingSosList() {
    final raw = _box.get('pending_sos');
    if (raw is String && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>?;
        return list?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      } catch (_) {}
    }
    return [];
  }

  Future<void> setPendingSosList(List<Map<String, dynamic>> list) async {
    await _box.put('pending_sos', jsonEncode(list));
  }

  List<Map<String, dynamic>> incidentsCache() {
    final raw = _box.get('incidents_cache');
    if (raw is String && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw) as List<dynamic>?;
        return list?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
      } catch (_) {}
    }
    return [];
  }

  Future<void> saveIncidentsCache(List<Map<String, dynamic>> rows) async {
    await _box.put('incidents_cache', jsonEncode(rows));
  }
}
