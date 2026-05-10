import 'package:flutter/material.dart';

import '../../core/bootstrap/global_store.dart';

Map<String, dynamic> _contactRow(Object? raw) => Map<String, dynamic>.from(raw as Map);

/// One-tap SMS + share live location placeholders.
class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final list = (gCitizenStore?.profileMap()['emergencyContacts'] as List<dynamic>?) ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency contacts')),
      body: ListView(
        children: [
          if (list.isEmpty)
            const ListTile(title: Text('Add contacts in Emergency Profile wizard'))
          else
            ...list.map(
              (raw) {
                final row = _contactRow(raw);
                return ListTile(
                  title: Text(row['fullName']?.toString() ?? ''),
                  subtitle: Text(row['phone']?.toString() ?? ''),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      IconButton(icon: const Icon(Icons.sms_outlined), onPressed: () {}),
                      IconButton(icon: const Icon(Icons.share_location), onPressed: () {}),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}
