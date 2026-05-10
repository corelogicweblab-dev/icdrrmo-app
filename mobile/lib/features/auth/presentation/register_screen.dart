import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/branding.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';
import '../data/auth_repository.dart';
import '../data/barangays_repository.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  final fullName = TextEditingController();
  final phone = TextEditingController(text: '+63');
  final streetPurok = TextEditingController();
  String? error;
  bool loading = false;
  List<PublicBarangay> barangays = [];
  String barangayId = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadBarangays());
  }

  Future<void> _loadBarangays() async {
    try {
      final list = await ref.read(barangaysRepositoryProvider).fetchPublic();
      if (mounted) setState(() => barangays = list);
    } catch (_) {
      if (mounted) setState(() => barangays = []);
    }
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    fullName.dispose();
    phone.dispose();
    streetPurok.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await ref.read(authRepositoryProvider).register(
            email: email.text.trim(),
            password: password.text,
            fullName: fullName.text.trim(),
            phone: phone.text.trim(),
            barangayId: barangayId.isEmpty ? null : barangayId,
            streetPurok: streetPurok.text.trim().isEmpty ? null : streetPurok.text.trim(),
          );
      if (!mounted) return;
      gCitizenStore?.profileComplete = false;
      Navigator.of(context).pushReplacementNamed(Routes.profileSetup);
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
        title: const Text('Create account'),
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
          const SizedBox(height: 16),
          Text(
            'Backend requires strong password (12+ chars) and E.164-like phone.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          TextFormField(controller: fullName, decoration: const InputDecoration(labelText: 'Full name')),
          TextFormField(controller: email, decoration: const InputDecoration(labelText: 'Email')),
          TextFormField(controller: phone, decoration: const InputDecoration(labelText: 'Phone (+63…)')),
          DropdownButtonFormField<String?>(
            key: ValueKey<Object>('reg_br_${barangayId}_${barangays.length}'),
            initialValue: barangayId.isEmpty ? null : barangayId,
            decoration: const InputDecoration(labelText: 'Barangay (optional)'),
            items: [
              const DropdownMenuItem<String?>(value: null, child: Text('— Select —')),
              ...barangays.map(
                (b) => DropdownMenuItem<String?>(value: b.id, child: Text(b.name)),
              ),
            ],
            onChanged: (String? v) => setState(() => barangayId = v ?? ''),
          ),
          TextFormField(
            controller: streetPurok,
            decoration: const InputDecoration(
              labelText: 'Street / purok (optional)',
              hintText: 'e.g. Purok 3, Malamawi Road',
            ),
          ),
          TextFormField(controller: password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
          if (error != null) Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 16),
          FilledButton(onPressed: loading ? null : _submit, child: const Text('Create & continue')),
        ],
      ),
    );
  }
}
