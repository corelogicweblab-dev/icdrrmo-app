import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/config/api_config.dart';
import '../../../core/health/health_check.dart';
import '../../../core/navigation/routes.dart';
import '../../../features/auth/data/auth_repository.dart';
import '../../../features/sos/data/offline_sos_queue.dart';

/// Boot: branding, health/ping, connectivity, forwards into gated flow.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulse;

  String _version = '';
  String _net = '…';
  String _server = '…';
  String _offlineQueued = '0';

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
    Future.microtask(_boot);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  Future<void> _boot() async {
    final pkg = await PackageInfo.fromPlatform();
    if (mounted) setState(() => _version = '${pkg.version}+${pkg.buildNumber}');

    final connectivity = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() => _net = connectivity.isEmpty ? 'none' : connectivity.map((e) => e.name).join(','));
    }

    final dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.restBase,
        connectTimeout: const Duration(seconds: 12),
        validateStatus: (_) => true,
      ),
    );
    final ok = await pingServerReachable(dio);
    final pending = await offlineQueueDepth();
    if (mounted) {
      setState(() {
        _server = ok ? 'Operational' : 'Offline / unreachable';
        _offlineQueued = '$pending';
      });
    }

    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;

    final store = gCitizenStore;
    if (store == null) {
      Navigator.of(context).pushReplacementNamed(Routes.login);
      return;
    }

    final authed = await ref.read(authRepositoryProvider).restoreSession();

    if (!store.onboardingDone) {
      Navigator.of(context).pushReplacementNamed(Routes.onboarding);
    } else if (!authed) {
      Navigator.of(context).pushReplacementNamed(Routes.login);
    } else if (!store.profileComplete) {
      Navigator.of(context).pushReplacementNamed(Routes.profileSetup);
    } else {
      Navigator.of(context).pushReplacementNamed(Routes.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [scheme.surfaceContainerHighest, scheme.surface],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                ScaleTransition(
                  scale: Tween(begin: 0.97, end: 1.03).animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut)),
                  child: Icon(Icons.shield_rounded, size: 96, color: scheme.primary),
                ),
                const SizedBox(height: 20),
                Text('ICDRRMO', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900)),
                Text('Citizen Emergency App', style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                const SizedBox(height: 32),
                CircularProgressIndicator(color: scheme.primary),
                const SizedBox(height: 24),
                Text('v$_version', style: Theme.of(context).textTheme.labelSmall?.copyWith(fontFamily: 'monospace')),
                const SizedBox(height: 8),
                Text('Network: $_net', style: Theme.of(context).textTheme.labelMedium),
                Text('Server: $_server', style: Theme.of(context).textTheme.labelMedium),
                Text(
                  'Emergency status: ${_offlineQueued != '0' ? '$_offlineQueued SOS queued (offline)' : 'standby'}',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(color: scheme.tertiary),
                ),
                const Spacer(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
