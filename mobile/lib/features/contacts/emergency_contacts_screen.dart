import 'package:flutter/material.dart';

import '../../core/bootstrap/global_store.dart';

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
            for (final r in list)
              ListTile(
                title: Text(Map<String, dynamic>.from(r as Map)['fullName']?.toString() ?? ''),
                subtitle: Text(Map<String, dynamic>.from(r as Map)['phone']?.toString() ?? ''),
                trailing: Wrap(
                  spacing: 8,
                  children: [
                    IconButton(icon: const Icon(Icons.sms_outlined), onPressed: () {}),
                    IconButton(icon: const Icon(Icons.share_location), onPressed: () {}),
                  ],
                ),
              ),
        ],
      ),
    );
  }
}
