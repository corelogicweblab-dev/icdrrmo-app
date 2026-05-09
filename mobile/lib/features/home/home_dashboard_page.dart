import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/bootstrap/global_store.dart';
import '../../core/permissions/citizen_permissions.dart';
import '../../core/providers/session_sub_provider.dart';
import '../sos/presentation/sos_activation_page.dart';

/// Top indicators + SOS + alerts + evacuation summary + connectivity.
class HomeDashboardPage extends ConsumerStatefulWidget {
  const HomeDashboardPage({super.key});

  @override
  ConsumerState<HomeDashboardPage> createState() => _HomeDashboardPageState();
}

class _HomeDashboardPageState extends ConsumerState<HomeDashboardPage> {
  final Battery _battery = Battery();
  int _bat = -1;
  String _conn = '?';
  bool _gps = false;

  Timer? _poll;

  @override
  void initState() {
    super.initState();
    Future.microtask(_pulse);
    _poll = Timer.periodic(const Duration(seconds: 30), (_) => _pulse());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _pulse() async {
    final b = await _battery.batteryLevel;
    final c = await Connectivity().checkConnectivity();
    final g = await CitizenPermissions.hasUsableLocation();
    if (mounted) {
      setState(() {
        _bat = b;
        _conn = c.isEmpty ? 'none' : c.map((e) => e.name).join(',');
        _gps = g;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final lowBw = gCitizenStore?.lowBandwidthMode ?? false;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              _chip(Icons.signal_cellular_alt, 'Net: $_conn', scheme.onSurface),
              const SizedBox(width: 8),
              _chip(Icons.gps_fixed, _gps ? 'GPS ready' : 'GPS needed', _gps ? scheme.primary : scheme.error),
              const SizedBox(width: 8),
              _chip(Icons.battery_charging_full, _bat < 0 ? 'Battery: …' : '$_bat%', scheme.secondary),
            ],
          ),
          if (lowBw)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('Low bandwidth mode active', style: TextStyle(color: scheme.tertiary, fontSize: 12)),
            ),
          const SizedBox(height: 20),
          Text('Emergency hotlines', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
          Wrap(
            spacing: 8,
            children: [
              ActionChip(label: const Text('117'), onPressed: () => _launch(context, tel: '117')),
              ActionChip(label: const Text('BFP Isabela'), onPressed: () => _launch(context, tel: '911')),
              ActionChip(label: const Text('ICDRRM Hotline'), onPressed: () => _launch(context, tel: '166')),
            ],
          ),
          const SizedBox(height: 16),
          Text('Current alerts', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
          Card(
            child: ListTile(
              leading: Icon(Icons.cloud_outlined, color: scheme.primary),
              title: const Text('Weather · monitor PAGASA'),
              subtitle: const Text('OpenWeather + PHIVOLCS integrations land in server push layer'),
            ),
          ),
          Card(
            child: ListTile(
              leading: Icon(Icons.tsunami_outlined, color: scheme.error),
              title: const Text('Evacuation readiness'),
              subtitle: const Text('Nearest centers update when GIS feed is connected'),
            ),
          ),
          const SizedBox(height: 12),
          Center(
            child: SizedBox(
              width: 240,
              height: 240,
              child: Material(
                elevation: 16,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const SosActivationPage()),
                    );
                  },
                  child: Ink(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [scheme.error, scheme.error.withValues(alpha: 0.85)]),
                    ),
                    child: const Center(
                      child: Text('SOS', style: TextStyle(fontSize: 44, fontWeight: FontWeight.w900, color: Colors.white)),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: ref.watch(jwtSubProvider).when(
                  data: (sub) => Text(
                    'Device-bound session · ${_shortId(sub)}',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
          ),
          const SizedBox(height: 12),
          Text(
            'WebSocket + background services continue while minimized (platform policies apply).',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  Widget _chip(IconData i, String label, Color c) {
    return Chip(
      avatar: Icon(i, size: 16, color: c),
      label: Text(label, style: const TextStyle(fontSize: 11)),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }

  static String _shortId(String? sub) {
    if (sub == null || sub.isEmpty) return '…';
    return sub.length <= 8 ? sub : '${sub.substring(0, 8)}…';
  }

  Future<void> _launch(BuildContext context, {required String tel}) async {
    final uri = Uri(scheme: 'tel', path: tel.replaceAll(RegExp(r'[^\d+]'), ''));
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Cannot dial $tel on this device')));
    }
  }
}
