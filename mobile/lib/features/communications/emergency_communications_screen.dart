import 'package:flutter/material.dart';

/// Future WebRTC voice + responder chat bridging.
class EmergencyCommunicationsScreen extends StatelessWidget {
  const EmergencyCommunicationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Communications')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Voice bridge + encrypted chat slot in for Agora / WebRTC + Socket.IO transcripts. '
            'During active incidents this surface surfaces dispatcher broadcasts first.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge,
          ),
        ),
      ),
    );
  }
}
