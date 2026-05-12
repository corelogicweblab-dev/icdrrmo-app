import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../core/branding.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/config/web_portal_config.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/storage/token_storage.dart';
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
        final target = role == 'RESPONDER' ? 'responder' : 'ops';
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
      appBar: AppBar(
        title: const Text('Sign in'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pushReplacementNamed(Routes.gateway),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Center(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(
                IcdrrmoBranding.logoAsset,
                width: 88,
                height: 88,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Icon(Icons.shield_outlined, size: 72, color: Theme.of(context).colorScheme.primary),
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text('Session persistence', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.tertiary)),
          TextFormField(controller: email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
          TextFormField(controller: password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: loading ? null : _submit,
            child: loading
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Login'),
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
