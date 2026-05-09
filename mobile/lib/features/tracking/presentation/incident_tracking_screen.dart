import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../core/bootstrap/global_store.dart';
import '../../../core/config/api_config.dart';
import '../../../core/network/dio_provider.dart';

/// Reads `incident_updated` + shows lifecycle labels (maps Prisma enums to UX strings).
class IncidentTrackingScreen extends ConsumerStatefulWidget {
  const IncidentTrackingScreen({super.key, required this.incidentId});

  final String incidentId;

  @override
  ConsumerState<IncidentTrackingScreen> createState() => _IncidentTrackingScreenState();
}

class _IncidentTrackingScreenState extends ConsumerState<IncidentTrackingScreen> {
  io.Socket? socket;
  String _statusUx = 'Pending';
  String _detail = 'Waiting on dispatcher linkage…';

  static String _titleId(String id) {
    if (id.length <= 12) return id;
    return '${id.substring(0, 8)}…';
  }

  static String uxFromBackend(String raw) {
    switch (raw.toUpperCase()) {
      case 'OPEN':
        return 'Pending';
      case 'ACKNOWLEDGED':
        return 'Verified';
      case 'DISPATCHED':
        return 'Dispatched';
      case 'IN_PROGRESS':
        return 'Responder active';
      case 'RESOLVED':
      case 'CLOSED':
        return 'Completed';
      case 'FALSE_ALARM':
        return 'Closed (false alarm)';
      default:
        return raw.replaceAll('_', ' ');
    }
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(_socket);
  }

  Future<void> _socket() async {
    final (token, _) = await ref.read(tokenStorageProvider).loadTokens();
    if (token == null || !mounted) return;

    socket = io.io(
      '${ApiConfig.socketBase}/realtime',
      io.OptionBuilder()
          .setPath('/socket.io')
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token}).build(),
    );

    socket!
      ..onConnect((_) {
        if (!mounted) return;
        setState(() => _detail = 'Realtime channel synced');
      })
      ..on('incident_updated', (dynamic data) {
        if (!mounted || data is! Map<dynamic, dynamic>) return;
        final id = data['incidentId'] as String?;
        if (id != widget.incidentId) return;
        final st = data['status'] as String?;
        setState(() {
          if (st != null) {
            _statusUx = uxFromBackend(st);
            _detail = 'Ops updated ${DateTime.now().toIso8601String()}';
          }
        });
      });
    socket!.connect();
  }

  @override
  void dispose() {
    socket?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: Text('Incident ${_titleId(widget.incidentId)}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Status', style: Theme.of(context).textTheme.titleSmall?.copyWith(color: scheme.onSurfaceVariant)),
          Text(_statusUx, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text(_detail),
          const SizedBox(height: 24),
          ListTile(
            leading: Icon(Icons.person_pin_circle_outlined, color: scheme.primary),
            title: const Text('Responder assignment'),
            subtitle: Text((gCitizenStore?.profileMap()['fullName'] as String?) ?? 'Will appear once dispatched'),
          ),
          ListTile(
            leading: Icon(Icons.map_outlined, color: scheme.primary),
            title: const Text('Live responder map'),
            subtitle: const Text('Mapbox / OSM overlays · wire field telemetry'),
          ),
          ListTile(
            leading: Icon(Icons.forum_outlined, color: scheme.primary),
            title: const Text('Dispatcher messages'),
            subtitle: const Text('Connect chat channel · WebSockets + durable SMS bridge'),
          ),
          const SizedBox(height: 36),
          FilledButton(
            onPressed: () => Navigator.of(context).popUntil((r) => r.isFirst),
            child: const Text('Close tracking'),
          ),
        ],
      ),
    );
  }
}
