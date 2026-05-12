import 'dart:io' show Platform;

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../config/firebase_env.dart';

final FlutterLocalNotificationsPlugin _fln = FlutterLocalNotificationsPlugin();

bool _localNotificationsReady = false;

const AndroidNotificationChannel _chEmergency = AndroidNotificationChannel(
  'icd_emergency',
  'Emergency alerts',
  description: 'Flood, red zone, and disaster directives from ICDRRMO',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
);

const AndroidNotificationChannel _chWeather = AndroidNotificationChannel(
  'icd_weather',
  'Weather updates',
  description: 'Scheduled weather outlook from ICDRRMO',
  importance: Importance.high,
  playSound: true,
  enableVibration: true,
);

@pragma('vm:entry-point')
Future<void> citizenMessagingBackgroundHandler(RemoteMessage message) async {
  if (FirebaseEnv.projectId.isEmpty) return;
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: FirebaseEnv.options);
  }
  await _ensureLocalNotifications();
  await _presentRemote(message);
}

Future<void> _ensureLocalNotifications() async {
  if (_localNotificationsReady) return;
  const init = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(),
  );
  await _fln.initialize(init);
  final android = _fln.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
  await android?.createNotificationChannel(_chEmergency);
  await android?.createNotificationChannel(_chWeather);
  _localNotificationsReady = true;
}

Future<void> _presentRemote(RemoteMessage m) async {
  final title = m.notification?.title ?? m.data['title'] ?? 'ICDRRMO';
  final body = m.notification?.body ?? m.data['body'] ?? '';
  final kind = m.data['kind'] ?? '';
  final emergency = kind != 'WEATHER_DIGEST' && kind != 'WEATHER_ALERT';
  final channel = emergency ? _chEmergency : _chWeather;
  final id = (m.messageId ?? '${m.sentTime?.millisecondsSinceEpoch ?? 0}').hashCode & 0x7fffffff;
  try {
    await HapticFeedback.heavyImpact();
  } catch (_) {
    /* ignored */
  }
  await _fln.show(
    id,
    title,
    body,
    NotificationDetails(
      android: AndroidNotificationDetails(
        channel.id,
        channel.name,
        channelDescription: channel.description,
        importance: channel.importance,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        ticker: title,
      ),
      iOS: const DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    ),
  );
}

String _devicePlatformJson() {
  if (kIsWeb) return 'WEB';
  try {
    if (Platform.isAndroid) return 'ANDROID';
    if (Platform.isIOS) return 'IOS';
  } catch (_) {
    return 'UNKNOWN';
  }
  return 'UNKNOWN';
}

/// Registers FCM with Nest after Firebase is initialized and user is signed in (JWT on Dio).
abstract final class CitizenPush {
  static bool _foregroundAttached = false;

  static Future<void> registerWithBackend(Dio dio) async {
    if (Firebase.apps.isEmpty || kIsWeb) return;
    try {
      final messaging = FirebaseMessaging.instance;
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
      await messaging.requestPermission(alert: true, badge: true, sound: true, provisional: false);
      await _ensureLocalNotifications();
      if (!_foregroundAttached) {
        _foregroundAttached = true;
        FirebaseMessaging.onMessage.listen((RemoteMessage m) async {
          await _presentRemote(m);
        });
      }
      final token = await messaging.getToken();
      if (token == null || token.isEmpty) return;
      await dio.post<void>(
        '/users/me/device-token',
        data: {'token': token, 'platform': _devicePlatformJson()},
      );
    } catch (e) {
      debugPrint('CitizenPush.registerWithBackend: $e');
    }
  }

  static Future<void> unregisterFromBackend(Dio dio) async {
    if (kIsWeb || Firebase.apps.isEmpty) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) return;
      await dio.delete<void>('/users/me/device-token', queryParameters: {'token': token});
    } catch (e) {
      debugPrint('CitizenPush.unregisterFromBackend: $e');
    }
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (_) {
      /* ignored */
    }
  }
}
