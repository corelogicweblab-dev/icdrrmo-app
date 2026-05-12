import 'package:flutter/material.dart';

import '../../../core/navigation/routes.dart';

/// Entry point: all roles sign in here; citizens stay in-app, staff opens the web console via token handoff.
class RoleGatewayScreen extends StatelessWidget {
  const RoleGatewayScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              Text(
                'ICDRRMO',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                'Choose how you use the system',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: scheme.onSurface.withValues(alpha: 0.65),
                    ),
              ),
              const SizedBox(height: 28),
              Expanded(
                child: ListView(
                  children: [
                    _RoleTile(
                      title: 'Citizen',
                      subtitle: 'Report SOS, emergencies, and evacuation — full mobile app.',
                      icon: Icons.health_and_safety_outlined,
                      accent: scheme.primary,
                      onTap: () =>
                          Navigator.of(context).pushNamed(Routes.login),
                    ),
                    const SizedBox(height: 12),
                    _RoleTile(
                      title: 'Responder',
                      subtitle:
                          'Field units — same sign-in; after login we open the web console with your session.',
                      icon: Icons.local_police_outlined,
                      accent: scheme.secondary,
                      onTap: () =>
                          Navigator.of(context).pushNamed(Routes.login),
                    ),
                    const SizedBox(height: 12),
                    _RoleTile(
                      title: 'Operator / EOC',
                      subtitle:
                          'City ops desk — same sign-in; opens the secure web dashboard after login.',
                      icon: Icons.dashboard_customize_outlined,
                      accent: scheme.tertiary,
                      onTap: () =>
                          Navigator.of(context).pushNamed(Routes.login),
                    ),
                  ],
                ),
              ),
              Text(
                'Citizens stay in the app. Responders and operators are sent to the web dashboard in the browser after a successful sign-in.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: scheme.onSurface.withValues(alpha: 0.45),
                      height: 1.35,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.accent,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.35),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: accent, size: 26),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurface.withValues(alpha: 0.72),
                            height: 1.35,
                          ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: scheme.onSurface.withValues(alpha: 0.35),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
