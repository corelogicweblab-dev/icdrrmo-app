import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';

import 'app.dart';
import 'core/bootstrap/global_store.dart';
import 'core/config/firebase_env.dart';
import 'core/push/citizen_push.dart';
import 'core/storage/citizen_local_store.dart';
import 'core/storage/token_storage.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Do not lock orientation from Dart; defer to the OS so portrait/rotation
  // lock and accessibility settings control the app like other apps.
  await SystemChrome.setPreferredOrientations(<DeviceOrientation>[]);

  await Hive.initFlutter();
  gCitizenStore = await CitizenLocalStore.open();

  final tokens = TokenStorage();
  final existingDevice = await tokens.readDeviceId();
  if (existingDevice == null || existingDevice.isEmpty) {
    await tokens.setDeviceId(const Uuid().v4());
  }

  if (FirebaseEnv.projectId.isNotEmpty) {
    FirebaseMessaging.onBackgroundMessage(citizenMessagingBackgroundHandler);
  }

  runApp(const ProviderScope(child: IcdrrmoApp()));
}
