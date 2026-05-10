import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/permissions/citizen_permissions.dart';

/// Spec: onboarding cannot finish without usable GPS permission.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pc = PageController();
  int _page = 0;

  bool _gpsOk = false;
  bool _notifGranted = false;
  bool _smsGranted = false;
  bool _bgLoc = false;

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  Future<void> _refreshPerms() async {
    final g = await CitizenPermissions.hasUsableLocation();
    if (mounted) setState(() => _gpsOk = g);
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(_refreshPerms);
  }

  Widget _slide(String title, String body, IconData icon) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Spacer(),
          Icon(icon, size: 56, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 20),
          Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          Text(body, style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.4)),
          const Spacer(),
        ],
      ),
    );
  }

  Future<void> _finish() async {
    if (!_gpsOk) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('GPS permission is mandatory for emergency readiness.')),
      );
      return;
    }
    final store = gCitizenStore;
    if (store != null) {
      store.onboardingDone = true;
      store.notificationsEnabledFlag = _notifGranted;
      store.smsPermissionFlag = _smsGranted;
      store.backgroundLocationFlag = _bgLoc;
    }
    if (mounted) Navigator.of(context).pushReplacementNamed(Routes.gateway);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Get ready')),
      body: Column(
        children: [
          LinearProgressIndicator(
            value: (_page + 1) / 7,
            minHeight: 3,
          ),
          Expanded(
            child: PageView(
              controller: _pc,
              onPageChanged: (i) => setState(() => _page = i),
              physics: const BouncingScrollPhysics(),
              children: [
                _slide(
                  'How SOS works',
                  'One tap sends your GPS, battery, emergency type, and medical profile snapshot to ICDRRMO. When data fails, formatted SMS fallback carries the essentials.',
                  Icons.emergency_outlined,
                ),
                _slide(
                  'Why GPS matters',
                  'Responders locate you precisely. Accuracy saves minutes — minutes save lives.',
                  Icons.location_searching_rounded,
                ),
                _slide(
                  'Offline-first',
                  'When the network drops, SOS is queued on-device with automatic retries. SMS can still egress on GSM.',
                  Icons.cloud_off_rounded,
                ),
                _slide(
                  'SMS fallback',
                  'Ultra-low-bandwidth SOS packets can be routed through SMS gateways when mobile data fails.',
                  Icons.sms_outlined,
                ),
                _slide(
                  'Responder tracking',
                  'After dispatch you will see statuses: pending → dispatched → en route → on scene — synchronized with ops.',
                  Icons.local_police_outlined,
                ),
                _slide(
                  'Emergency notifications',
                  'Enable alerts for evacuation, flood, earthquake, typhoon, and responder updates.',
                  Icons.notifications_active_outlined,
                ),
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: ListView(
                    children: [
                      Text('Permissions checklist', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 16),
                      ListTile(
                        leading: Icon(_gpsOk ? Icons.check_circle : Icons.warning_amber, color: _gpsOk ? scheme.primary : scheme.error),
                        title: const Text('Enable GPS'),
                        subtitle: Text(_gpsOk ? 'Location services granted' : 'Required — SOS cannot activate without GPS'),
                        onTap: () async {
                          final ok = await CitizenPermissions.ensureLocationForOnboarding();
                          if (mounted) setState(() => _gpsOk = ok);
                        },
                      ),
                      ListTile(
                        leading: Icon(_notifGranted ? Icons.check_circle : Icons.notifications_none),
                        title: const Text('Enable notifications'),
                        subtitle: const Text('Weather, evacuation, responder updates'),
                        onTap: () async {
                          final g = await CitizenPermissions.ensureNotifications();
                          if (mounted) setState(() => _notifGranted = g);
                        },
                      ),
                      ListTile(
                        leading: Icon(_smsGranted ? Icons.check_circle : Icons.sms),
                        title: const Text('Enable SMS (Android)'),
                        subtitle: const Text('Outbound failover packets'),
                        onTap: () async {
                          final g = await CitizenPermissions.ensureSmsSend();
                          if (mounted) setState(() => _smsGranted = g);
                        },
                      ),
                      ListTile(
                        leading: Icon(_bgLoc ? Icons.check_circle : Icons.my_location_outlined),
                        title: const Text('Background location (recommended)'),
                        subtitle: const Text('Live tracking mode during emergencies'),
                        onTap: () async {
                          final g = await CitizenPermissions.requestBackgroundLocation();
                          if (mounted) setState(() => _bgLoc = g);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            child: Row(
              children: [
                if (_page > 0)
                  TextButton(
                    onPressed: () =>
                        _pc.previousPage(duration: const Duration(milliseconds: 280), curve: Curves.easeOut),
                    child: const Text('Back'),
                  ),
                const Spacer(),
                if (_page < 6)
                  FilledButton(
                    onPressed: () =>
                        _pc.nextPage(duration: const Duration(milliseconds: 280), curve: Curves.easeOut),
                    child: Text(_page == 5 ? 'Permissions' : 'Continue'),
                  )
                else
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: _gpsOk ? scheme.primary : scheme.error),
                    onPressed: _finish,
                    child: Text(_gpsOk ? 'Continue' : 'GPS required'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
