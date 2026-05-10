import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../../core/bootstrap/global_store.dart';
import '../../core/firestore/citizen_firestore_sync.dart';

String _localBarangayLine(Map<String, dynamic> m) {
  final name = '${m['barangayName'] ?? ''}'.trim();
  if (name.isNotEmpty) return name;
  final id = '${m['barangayId'] ?? ''}'.trim();
  return id.isEmpty ? '—' : id;
}

String _localStreetLine(Map<String, dynamic> m) {
  final s = '${m['streetPurok'] ?? ''}'.trim();
  return s.isEmpty ? '—' : s;
}

/// Profile summary: local Hive + live Firestore row when Firebase is configured and signed in.
class ProfileOverviewTab extends StatelessWidget {
  const ProfileOverviewTab({super.key, required this.onOpenSettings});

  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final Map<String, dynamic> m =
        Map<String, dynamic>.from(gCitizenStore?.profileMap() ?? const <String, dynamic>{});
    final ref = CitizenFirestoreSync.profileDocRef();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (ref != null)
          StreamBuilder<DocumentSnapshot<Map<String, dynamic>>>(
            stream: ref.snapshots(),
            builder: (
              BuildContext context,
              AsyncSnapshot<DocumentSnapshot<Map<String, dynamic>>> snap,
            ) {
              if (snap.hasError) {
                return ListTile(
                  title: const Text('Cloud profile'),
                  subtitle: Text('Error: ${snap.error}', style: const TextStyle(fontSize: 12)),
                );
              }
              if (!snap.hasData || !snap.data!.exists) {
                return const ListTile(
                  title: Text('Cloud profile'),
                  subtitle: Text('Waiting for sync from server…', style: TextStyle(fontSize: 12)),
                );
              }
              final d = snap.data!.data() ?? {};
              final prof = d['profile'];
              Map<String, dynamic>? p;
              if (prof is Map) {
                p = Map<String, dynamic>.from(prof);
              }
              final streetRaw = p?['streetPurok']?.toString().trim() ?? '';
              final streetCloud = streetRaw.isEmpty ? '—' : streetRaw;
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Live (Firestore)', style: Theme.of(context).textTheme.labelLarge),
                      const SizedBox(height: 8),
                      Text('Name: ${p?['fullName'] ?? d['email'] ?? '—'}', style: const TextStyle(fontSize: 13)),
                      Text('Barangay: ${p?['barangayName'] ?? p?['barangayId'] ?? '—'}', style: const TextStyle(fontSize: 13)),
                      Text('Street / purok: $streetCloud', style: const TextStyle(fontSize: 13)),
                      Text('Blood: ${p?['bloodType'] ?? '—'}', style: const TextStyle(fontSize: 13)),
                      Text('Status: ${p?['availabilityStatus'] ?? '—'}', style: const TextStyle(fontSize: 13)),
                    ],
                  ),
                ),
              );
            },
          )
        else
          ListTile(
            title: const Text('Cloud profile'),
            subtitle: Text(
              CitizenFirestoreSync.isConfigured
                  ? 'Sign in again to attach Firebase (custom token).'
                  : 'Enable Firebase: add --dart-define FIREBASE_PROJECT_ID, FIREBASE_WEB_API_KEY, FIREBASE_APP_ID, FIREBASE_MESSAGING_SENDER_ID.',
              style: const TextStyle(fontSize: 12),
            ),
          ),
        const Divider(height: 24),
        Text('On this device', style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 8),
        ListTile(title: Text(m['fullName']?.toString() ?? '—'), subtitle: const Text('Full name (local)')),
        ListTile(
          title: Text(_localBarangayLine(m)),
          subtitle: const Text('Barangay (local)'),
        ),
        ListTile(
          title: Text(_localStreetLine(m)),
          subtitle: const Text('Street / purok (local)'),
        ),
        ListTile(title: Text(m['bloodType']?.toString() ?? '—'), subtitle: const Text('Blood (local)')),
        ElevatedButton.icon(
          icon: const Icon(Icons.settings_outlined),
          label: const Text('Settings · accessibility · low bandwidth'),
          onPressed: onOpenSettings,
        ),
      ],
    );
  }
}
