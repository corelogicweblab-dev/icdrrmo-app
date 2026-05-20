import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/jwt_decode.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/branding.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/theme/icd_colors.dart';
import '../../../core/network/dio_provider.dart';

/// Same entry experience as web `/` — always the first screen on cold start (see [IcdrrmoApp]).
class RoleGatewayScreen extends ConsumerWidget {
  const RoleGatewayScreen({super.key});

  Future<void> _openCitizen(BuildContext context, WidgetRef ref) async {
    final store = gCitizenStore;
    if (store == null) {
      if (context.mounted) Navigator.of(context).pushNamed(Routes.login);
      return;
    }
    if (!store.onboardingDone) {
      if (context.mounted) Navigator.of(context).pushReplacementNamed(Routes.onboarding);
      return;
    }
    final (access, _) = await ref.read(tokenStorageProvider).loadTokens();
    if (!context.mounted) return;
    if (access != null && access.isNotEmpty && jwtRole(access) == 'CITIZEN') {
      if (!store.profileComplete) {
        Navigator.of(context).pushReplacementNamed(Routes.profileSetup);
      } else {
        Navigator.of(context).pushReplacementNamed(Routes.home);
      }
      return;
    }
    Navigator.of(context).pushNamed(Routes.login);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);
    final wide = mq.size.width >= 720;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Column(
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.45),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: IcdColors.orange.withValues(alpha: 0.45)),
                        boxShadow: [
                          BoxShadow(
                            color: IcdColors.red.withValues(alpha: 0.4),
                            blurRadius: 40,
                            spreadRadius: -8,
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.asset(
                          IcdrrmoBranding.logoAsset,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Icon(Icons.shield_moon_outlined, size: 56, color: scheme.primary),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'ISABELA CITY · BASILAN',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 3.5,
                            color: IcdColors.orangeGlow,
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'ICDRRMO SMART Emergency Response',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Three separate portals — Citizen, Responder, and Operator / EOC. Use the card that matches your role. '
                      'PWA: open in Chrome or Safari, then Share → Add to Home screen.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFFa1a1aa),
                            height: 1.45,
                          ),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'CHOOSE YOUR ENTRY POINT',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2.8,
                            color: const Color(0xFF71717a),
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Citizens use the first card (account + SOS). Responders and operators each have their own sign-in — '
                      'do not use the citizen portal for desk or field roles.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF71717a),
                            height: 1.4,
                            fontSize: 13,
                          ),
                    ),
                    const SizedBox(height: 20),
                    LayoutBuilder(
                      builder: (context, c) {
                        final useRow = c.maxWidth >= 720;
                        final cards = [
                          _GatewayCard(
                            title: 'Citizen',
                            tag: 'Residents & public',
                            icon: Icons.smartphone_outlined,
                            description:
                                'Create an account, complete profile (barangay, street), capture GPS, and send SOS. Not for dispatch staff.',
                            onTap: () => _openCitizen(context, ref),
                          ),
                          _GatewayCard(
                            title: 'Responder',
                            tag: 'Field units',
                            icon: Icons.shield_outlined,
                            description:
                                'Responder sign-in — assignments, map, and profile. Requires a responder account from ICDRRMO.',
                            onTap: () => Navigator.of(context).pushNamed(Routes.login),
                          ),
                          _GatewayCard(
                            title: 'Operator / EOC',
                            tag: 'Operations desk',
                            icon: Icons.dashboard_customize_outlined,
                            description:
                                'Privileged operations console — live queue, situation map, assignments, audit (admin / operator).',
                            onTap: () => Navigator.of(context).pushNamed(Routes.login),
                          ),
                        ];
                        if (useRow) {
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              for (var i = 0; i < cards.length; i++) ...[
                                if (i > 0) const SizedBox(width: 16),
                                Expanded(child: cards[i]),
                              ],
                            ],
                          );
                        }
                        return Column(
                          children: [
                            for (var i = 0; i < cards.length; i++) ...[
                              if (i > 0) const SizedBox(height: 12),
                              cards[i],
                            ],
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'AUTHORIZED USE ONLY · AUDITED ACCESS',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            letterSpacing: 2,
                            color: const Color(0xFF52525b),
                          ),
                    ),
                    if (!wide) ...[
                      const SizedBox(height: 8),
                      Text(
                        'Citizens stay in the app. Responders and operators open the web dashboard in the browser after sign-in.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: scheme.onSurface.withValues(alpha: 0.45),
                              height: 1.35,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _GatewayCard extends StatelessWidget {
  const _GatewayCard({
    required this.title,
    required this.tag,
    required this.icon,
    required this.description,
    required this.onTap,
  });

  final String title;
  final String tag;
  final IconData icon;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xF00A0604),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: IcdColors.orange.withValues(alpha: 0.35)),
            boxShadow: [
              BoxShadow(
                color: IcdColors.orange.withValues(alpha: 0.08),
                blurRadius: 24,
                spreadRadius: -4,
              ),
            ],
          ),
          padding: const EdgeInsets.all(20),
          constraints: const BoxConstraints(minHeight: 200),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: IcdColors.orange.withValues(alpha: 0.35)),
                      color: IcdColors.orange.withValues(alpha: 0.08),
                    ),
                    child: Icon(icon, color: IcdColors.orangeGlow, size: 26),
                  ),
                  const Spacer(),
                  Icon(Icons.arrow_forward_rounded, color: Colors.white.withValues(alpha: 0.25), size: 22),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                tag.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                      color: IcdColors.orange,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF71717a),
                      height: 1.4,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
