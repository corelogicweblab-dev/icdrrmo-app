import 'package:flutter/material.dart';
import '../../core/bootstrap/global_store.dart';

class IncidentArchivePage extends StatelessWidget {
  const IncidentArchivePage({super.key});

  @override
  Widget build(BuildContext context) {
    final rows = gCitizenStore?.incidentsCache() ?? [];
    if (rows.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('No incidents synced on this handset yet.'),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: rows.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (ctx, i) {
        final r = rows[i];
        return ListTile(
          leading: const Icon(Icons.local_fire_department_outlined),
          title: Text('${r['type']} incident'),
          subtitle: Text(r['id'] as String? ?? ''),
        );
      },
    );
  }
}
