import 'package:flutter/material.dart';

/// Offline map placeholder — evacuation anchors shown as a list until GIS layers are connected.
class EvacMapPage extends StatelessWidget {
  const EvacMapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        Text('Nearest evacuation anchors (reference)', style: TextStyle(fontWeight: FontWeight.w700)),
        SizedBox(height: 12),
        ListTile(title: Text('Isabela Sports Complex'), subtitle: Text('Capacity 850 · medical triage standby')),
        ListTile(title: Text('District school annex'), subtitle: Text('Shelter‑in‑place zone · generator bank')),
      ],
    );
  }
}
