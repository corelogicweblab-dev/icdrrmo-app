import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/firebase_env.dart';
import 'citizen_push.dart' show citizenMessagingBackgroundHandler;

export 'citizen_push.dart' show citizenMessagingBackgroundHandler;

final FlutterLocalNotificationsPlugin _chairmanFln = FlutterLocalNotificationsPlugin();

bool _chairmanLocalReady = false;

const AndroidNotificationChannel _chChairmanAlarm = AndroidNotificationChannel(
  'icd_chairman_alarm',
  'Barangay chairman emergency',
  description: 'First-responder alarms for barangay chairmen — sound and vibration',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
);

Future<void> _ensureChairmanLocalNotifications() async {
  if (_chairmanLocalReady) return;
  const init = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(),
  );
  await _chairmanFln.initialize(init);
  final android =
      _chairmanFln.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
  await android?.createNotificationChannel(_chChairmanAlarm);
  _chairmanLocalReady = true;
}

Future<void> presentChairmanAlarm(RemoteMessage m) async {
  final title = m.notification?.title ?? m.data['title'] ?? 'ICDRRMO Emergency';
  final body = m.notification?.body ?? m.data['body'] ?? '';
  final id = (m.messageId ?? '${m.sentTime?.millisecondsSinceEpoch ?? 0}').hashCode & 0x7fffffff;
  await _ensureChairmanLocalNotifications();
  for (var i = 0; i < 3; i++) {
    try {
      await HapticFeedback.heavyImpact();
    } catch (_) {
      /* ignored */
    }
  }
  await _chairmanFln.show(
    id,
    title,
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        _chChairmanAlarm.id,
        _chChairmanAlarm.name,
        channelDescription: _chChairmanAlarm.description,
        importance: Importance.max,
        priority: Priority.max,
        fullScreenIntent: true,
        category: AndroidNotificationCategory.alarm,
        playSound: true,
        enableVibration: true,
        ticker: title,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      ),
    ),
  );
  final openRoute = m.data['openRoute'] == '1';
  final lat = m.data['latitude'];
  final lon = m.data['longitude'];
  if (openRoute && lat != null && lon != null) {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$lat,$lon&travelmode=driving',
    );
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

String _devicePlatformJson() {
  if (kIsWeb) return 'WEB';
  return 'ANDROID';
}

/// FCM registration for barangay chairman accounts (`POST /chairman/me/device-token`).
abstract final class ChairmanPush {
  static bool _foregroundAttached = false;

  static Future<void> registerWithBackend(Dio dio) async {
    if (Firebase.apps.isEmpty || kIsWeb) return;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: true,
        provisional: false,
      );
      await _ensureChairmanLocalNotifications();
      if (!_foregroundAttached) {
        _foregroundAttached = true;
        FirebaseMessaging.onMessage.listen((RemoteMessage m) async {
          final isChairman = m.data['channel'] == 'chairman_alarm' || m.data['alarm'] == '1';
          if (isChairman) {
            await presentChairmanAlarm(m);
          }
        });
      }
      final token = await messaging.getToken();
      if (token == null || token.isEmpty) return;
      await dio.post<void>(
        '/chairman/me/device-token',
        data: {'token': token, 'platform': _devicePlatformJson()},
      );
    } catch (e) {
      debugPrint('ChairmanPush.registerWithBackend: $e');
    }
  }
}
