import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/auth/jwt_decode.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/models/emergency_type.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/network/dio_provider.dart';
import '../data/offline_sos_queue.dart';
import '../data/sms_fallback_send.dart';
import '../data/sos_repository.dart';

class SosActivationPage extends ConsumerStatefulWidget {
  const SosActivationPage({super.key});

  @override
  ConsumerState<SosActivationPage> createState() => _SosActivationPageState();
}

class _SosActivationPageState extends ConsumerState<SosActivationPage> {
  bool sending = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Confirm emergency')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '1-tap SOS: choose the closest category. ICDRRMO receives GPS, vitals snapshot, encrypted profile excerpt, '
              'and attaches you to realtime incident tracking.',
            ),
            const SizedBox(height: 16),
            Expanded(
              child: GridView(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 1.5,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                children: [
                  for (final t in EmergencyTypeApi.values)
                    FilledButton.tonal(
                      onPressed: sending ? null : () => _commit(context, t),
                      child: Text(t.displayLabel, textAlign: TextAlign.center),
                    ),
                ],
              ),
            ),
            if (sending)
              const Center(
                child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _commit(BuildContext context, EmergencyTypeApi type) async {
    setState(() => sending = true);

    Position? pos;
    try {
      pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: (gCitizenStore?.lowBandwidthMode ?? false) ? LocationAccuracy.medium : LocationAccuracy.high,
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unable to capture GPS fix — SOS blocked until satellites lock.')),
        );
      }
      setState(() => sending = false);
      return;
    }

    final battery = Battery();
    final bat = await battery.batteryLevel;

    /// Signal surrogate: coarse connectivity heuristic (LTE/Wi‑Fi metering comes from native plugins later).
    var signalPct = 0;
    final conn = await Connectivity().checkConnectivity();
    if (conn.any((r) => r != ConnectivityResult.none)) {
      signalPct = 72;
    }

    final access = await ref.read(tokenStorageProvider).loadTokens();
    final jwt = access.$1;
    final uid = jwtSub(jwt ?? '') ?? 'unknown';

    String? incidentId;
    Exception? capture;

    try {
      incidentId = await ref.read(sosRepositoryProvider).submitSos(
            type: type,
            latitude: pos.latitude,
            longitude: pos.longitude,
            batteryLevel: bat,
            signalStrength: signalPct,
          );
    } catch (e) {
      capture = Exception('$e');
      await enqueueOfflineSos(
        type: type,
        latitude: pos.latitude,
        longitude: pos.longitude,
        battery: bat,
        signalPct: signalPct,
        userId: uid,
      );

      /// SMS fallback envelope (dual path with offline queue).
      final smsBody = buildSmsFallbackPacket(userId: uid, lat: pos.latitude, lng: pos.longitude, type: type, battery: bat);
      await sendSosSms(smsBody);
    }

    if (incidentId != null) {
      final cache = gCitizenStore?.incidentsCache() ?? [];
      cache.insert(0, {
        'id': incidentId,
        'type': type.wireValue,
        'createdAtMs': DateTime.now().millisecondsSinceEpoch,
      });
      final store = gCitizenStore;
      if (store != null) {
        await store.saveIncidentsCache(cache);
      }
    }

    if (!mounted) return;
    setState(() => sending = false);

    if (incidentId != null) {
      Navigator.of(context).pushReplacementNamed(Routes.track, arguments: incidentId);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            capture == null
                ? 'SOS stored offline / SMS dispatched — ICDRRMO will reconcile when LTE returns.'
                : 'API failed · queued + SMS envelope attempted (${capture.toString()})',
          ),
        ),
      );
      Navigator.of(context).pop();
    }
  }
}
