import 'package:flutter/material.dart';

/// Lightweight offline plaintext cards — hydrate from JSON asset bundle later.
class SafetyGuideScreen extends StatelessWidget {
  const SafetyGuideScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final guides = <String>[
      'Flood survival — evacuate perpendicular to river flow.',
      'Earthquake Drop–Cover–Hold; mind aftershocks and gas lines.',
      'Typhoon shutters + go-bags; verify barangay signal levels.',
      'Fire — stay low in smoke; cut electrical mains if trained.',
      'Evacuation — follow ICDRRMO route advisories.',
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Safety guides · offline')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: guides
            .map(
              (g) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(g),
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}
