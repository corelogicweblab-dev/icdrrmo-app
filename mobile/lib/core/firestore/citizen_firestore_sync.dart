import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../config/firebase_env.dart';

/// After Nest JWT login, exchange for a Firebase custom token so `citizen_profiles/{uid}` is readable on-device.
abstract final class CitizenFirestoreSync {
  static bool get isConfigured => FirebaseEnv.projectId.isNotEmpty;

  static Future<void> _ensureApp() async {
    if (!isConfigured) return;
    if (Firebase.apps.isNotEmpty) return;
    await Firebase.initializeApp(options: FirebaseEnv.options);
  }

  /// Call with the same [Dio] that attaches `Authorization: Bearer <Nest JWT>`.
  static Future<void> signInWithBackend(Dio dio) async {
    if (!isConfigured) return;
    await _ensureApp();
    final res = await dio.post<Map<String, dynamic>>('/auth/firebase-custom-token');
    if (res.statusCode == null || res.statusCode! >= 400) return;
    final token = res.data?['customToken'] as String?;
    if (token == null || token.isEmpty) return;
    await FirebaseAuth.instance.signInWithCustomToken(token);
  }

  static Future<void> signOut() async {
    if (Firebase.apps.isEmpty) return;
    await FirebaseAuth.instance.signOut();
  }

  static DocumentReference<Map<String, dynamic>>? profileDocRef() {
    if (Firebase.apps.isEmpty) return null;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null || uid.isEmpty) return null;
    return FirebaseFirestore.instance.collection('citizen_profiles').doc(uid);
  }
}
