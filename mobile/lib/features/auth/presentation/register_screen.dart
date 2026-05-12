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
  bool _barangaysLoading = true;
  String? _barangaysLoadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadBarangays());
  }

  Future<void> _loadBarangays() async {
    setState(() {
      _barangaysLoading = true;
      _barangaysLoadError = null;
    });
    try {
      final list = await ref.read(barangaysRepositoryProvider).fetchPublic();
      if (!mounted) return;
      setState(() {
        barangays = list;
        _barangaysLoading = false;
        _barangaysLoadError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        barangays = isabelaOfflineBarangays();
        _barangaysLoading = false;
        _barangaysLoadError =
            'Could not reach barangay API — using offline Isabela list. Check API_BASE / network. ($e)';
      });
    }
  }

  String? _barangayDropdownValue() {
    if (barangayId.isEmpty) return null;
    return barangays.any((b) => b.id == barangayId) ? barangayId : null;
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
          if (_barangaysLoading)
            const Padding(
              padding: EdgeInsets.only(bottom: 8),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          if (_barangaysLoadError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _barangaysLoadError!,
                style: TextStyle(color: Theme.of(context).colorScheme.error, fontSize: 12),
              ),
            ),
          DropdownButtonFormField<String?>(
            key: const ValueKey<String>('register_barangay_dropdown'),
            value: _barangayDropdownValue(),
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Barangay (optional)'),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text(
                  '— Select —',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                ),
              ),
              ...barangays.map(
                (b) => DropdownMenuItem<String?>(
                  value: b.id,
                  child: Text(
                    b.name,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                  ),
                ),
              ),
            ],
            onChanged: _barangaysLoading ? null : (String? v) => setState(() => barangayId = v ?? ''),
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
