import 'package:flutter/material.dart';

class AlertsHubPage extends StatelessWidget {
  const AlertsHubPage({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: scheme.primary.withValues(alpha: 0.35)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Firebase Cloud Messaging', style: Theme.of(context).textTheme.titleSmall),
              Text(
                'Add google-services.json + GoogleService-Info.plist, then instantiate MessagingService.initialize().',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        const Divider(height: 32),
        for (final a in [
          ('Typhoon bulletin', 'PAGASA — monitor swell + wind cones'),
          ('Flood watch', 'Hydro sensors + barangay captains cascade'),
          ('Earthquake', 'PHIVOLCS intensity overlays'),
          ('Responder push', 'ICDRRMO ops channel emits via FCM/APNs stub'),
        ])
          Card(
            child: ListTile(
              title: Text(a.$1),
              subtitle: Text(a.$2),
              trailing: const Icon(Icons.notifications_active_outlined),
            ),
          ),
      ],
    );
  }
}
