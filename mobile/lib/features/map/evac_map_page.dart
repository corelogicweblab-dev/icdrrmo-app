import 'package:flutter/material.dart';

/// Offline/OSM placeholders — swap `flutter_map` + MBTiles bundle later.
class EvacMapPage extends StatelessWidget {
  const EvacMapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('Nearest evacuation anchors (seed data)', style: TextStyle(fontWeight: FontWeight.w700)),
        SizedBox(height: 12),
        ListTile(title: Text('Isabela Sports Complex'), subtitle: Text('Capacity 850 · medical triage standby')),
        ListTile(title: Text('District school annex'), subtitle: Text('Shelter‑in‑place zone · generator bank')),
      ],
    );
  }
}
