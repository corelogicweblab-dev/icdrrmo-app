import 'dart:io';

import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

/// GPS is mandatory for onboarding completion (spec).
final class CitizenPermissions {
  /// Returns true only if we can proceed with SOS / home (always or whileInUse acceptable).
  static Future<bool> hasUsableLocation() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;
    final p = await Geolocator.checkPermission();
    return p == LocationPermission.always || p == LocationPermission.whileInUse;
  }

  static Future<bool> ensureLocationForOnboarding() async {
    final service = await Geolocator.isLocationServiceEnabled();
    if (!service) {
      await Geolocator.openLocationSettings();
      return await hasUsableLocation();
    }
    var p = await Geolocator.checkPermission();
    if (p == LocationPermission.denied) {
      p = await Geolocator.requestPermission();
    }
    if (p == LocationPermission.deniedForever) {
      await openAppSettings();
      return false;
    }
    return p == LocationPermission.always || p == LocationPermission.whileInUse;
  }

  /// Android 13+ notifications; no-op denial on older / iOS handled by Pod.
  static Future<bool> ensureNotifications() async {
    final s = await Permission.notification.request();
    return s.isGranted;
  }

  /// SMS send (Android-heavy). iOS falls back through API only.
  static Future<bool> ensureSmsSend() async {
    if (!Platform.isAndroid) return false;
    final sms = await Permission.sms.request();
    return sms.isGranted;
  }

  /// Optional background tracking — prompts when supported.
  static Future<bool> requestBackgroundLocation() async {
    if (await Permission.locationAlways.isGranted) return true;
    final whenInUse = await Permission.locationWhenInUse.request();
    if (!whenInUse.isGranted) return false;
    final always = await Permission.locationAlways.request();
    return always.isGranted;
  }
}
