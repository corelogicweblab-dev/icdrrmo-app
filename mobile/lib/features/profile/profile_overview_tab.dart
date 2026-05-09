import 'package:flutter/material.dart';

import '../../core/bootstrap/global_store.dart';

/// Profile summary + shortcuts.
class ProfileOverviewTab extends StatelessWidget {
  const ProfileOverviewTab({super.key, required this.onOpenSettings});

  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context) {
    final m = gCitizenStore?.profileMap() ?? {};
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(title: Text(m['fullName']?.toString() ?? '—'), subtitle: const Text('Full name')),
        ListTile(title: Text(m['barangayId']?.toString() ?? '—'), subtitle: const Text('Barangay')),
        ListTile(title: Text(m['bloodType']?.toString() ?? '—'), subtitle: const Text('Blood')),
        ElevatedButton.icon(
          icon: const Icon(Icons.settings_outlined),
          label: const Text('Settings · accessibility · low bandwidth'),
          onPressed: onOpenSettings,
        ),
      ],
    );
  }
}
