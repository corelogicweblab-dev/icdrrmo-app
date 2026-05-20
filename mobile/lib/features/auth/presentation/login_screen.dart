import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../core/branding.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/config/web_portal_config.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/theme/icd_colors.dart';
import '../../../core/widgets/icd_hud_card.dart';
import '../data/auth_repository.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool loading = false;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final role = await ref.read(authRepositoryProvider).login(email: email.text.trim(), password: password.text);
      if (!mounted) return;
      if (role != 'CITIZEN') {
        final web = WebPortalConfig.resolvedAdminWebBase;
        if (web.isEmpty) {
          await ref.read(authRepositoryProvider).logout();
          setState(() => error = 'Set ICDRRMO_WEB_URL for this build so we can open the web console.');
          return;
        }
        final target = role == 'RESPONDER'
            ? 'responder'
            : role == 'BARANGAY_CHAIRMAN'
                ? 'chairman'
                : 'ops';
        final (access, _) = await ref.read(tokenStorageProvider).loadTokens();
        if (access == null || access.isEmpty) {
          setState(() => error = 'Missing access token after sign-in.');
          return;
        }
        final uri = Uri.parse('$web/auth/handoff?target=$target#t=${Uri.encodeComponent(access)}');
        final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
        if (!ok && mounted) {
          setState(() => error = 'Could not open browser for web console.');
        }
        await ref.read(authRepositoryProvider).logout();
        if (!mounted) return;
        Navigator.of(context).pushReplacementNamed(Routes.gateway);
        return;
      }
      final store = gCitizenStore;
      if (store == null) {
        Navigator.of(context).pushReplacementNamed(Routes.login);
        return;
      }
      Navigator.of(context).pushReplacementNamed(
        store.profileComplete ? Routes.home : Routes.profileSetup,
      );
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Sign in'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushReplacementNamed(Routes.gateway),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 100,
              height: 100,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: IcdColors.orange.withValues(alpha: 0.45)),
                boxShadow: [
                  BoxShadow(color: IcdColors.red.withValues(alpha: 0.35), blurRadius: 32, spreadRadius: -4),
                ],
                color: Colors.black.withValues(alpha: 0.5),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(
                  IcdrrmoBranding.logoAsset,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.shield_outlined, size: 64, color: IcdColors.orange),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'SECURE CHANNEL',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  letterSpacing: 3,
                  color: IcdColors.orangeGlow,
                ),
          ),
          const SizedBox(height: 16),
          IcdHudCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Account sign-in',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 6),
                Text(
                  'Citizens stay in-app. Responders, operators, and chairmen open the web console after login.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: email,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: password,
                  decoration: const InputDecoration(labelText: 'Password'),
                  obscureText: true,
                ),
                if (error != null) ...[
                  const SizedBox(height: 12),
                  Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12)),
                ],
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: loading ? null : _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: IcdColors.orangeDim,
                    minimumSize: const Size.fromHeight(48),
                  ),
                  child: loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: IcdColors.white),
                        )
                      : const Text('Continue'),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pushNamed(context, Routes.register),
            child: const Text('Create account'),
          ),
          TextButton(
            onPressed: () => Navigator.pushNamed(context, Routes.forgotPassword),
            child: const Text('Forgot password'),
          ),
        ],
      ),
    );
  }
}
