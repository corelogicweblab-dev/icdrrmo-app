import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/branding.dart';
import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';
import '../data/auth_repository.dart';
import '../data/barangays_repository.dart';

const _genders = <({String value, String label})>[
  (value: 'MALE', label: 'Male'),
  (value: 'FEMALE', label: 'Female'),
  (value: 'OTHER', label: 'Other'),
];

const _bloodTypes = <({String value, String label})>[
  (value: 'A_POS', label: 'A+ (Rh positive)'),
  (value: 'A_NEG', label: 'A− (Rh negative)'),
  (value: 'B_POS', label: 'B+ (Rh positive)'),
  (value: 'B_NEG', label: 'B− (Rh negative)'),
  (value: 'O_POS', label: 'O+ (Rh positive)'),
  (value: 'O_NEG', label: 'O− (Rh negative)'),
  (value: 'AB_POS', label: 'AB+ (Rh positive)'),
  (value: 'AB_NEG', label: 'AB− (Rh negative)'),
];

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
  final medicalConditions = TextEditingController();
  String? error;
  bool loading = false;
  List<PublicBarangay> barangays = [];
  String barangayId = '';
  bool _barangaysLoading = true;
  String? _barangaysLoadError;
  DateTime? _birthday;
  String _gender = 'MALE';
  String _bloodType = 'O_POS';
  XFile? _photoFile;

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
            'Could not load the barangay list from the server. Using an offline reference list. Check your connection.';
      });
    }
  }

  String? _barangayDropdownValue() {
    if (barangayId.isEmpty) return null;
    return barangays.any((b) => b.id == barangayId) ? barangayId : null;
  }

  int? _ageFromDob() {
    final d = _birthday;
    if (d == null) return null;
    final now = DateTime.now();
    var age = now.year - d.year;
    if (now.month < d.month || (now.month == d.month && now.day < d.day)) {
      age--;
    }
    return age;
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final initial = _birthday ?? DateTime(now.year - 25, now.month, now.day);
    final first = DateTime(now.year - 100, 1, 1);
    final last = DateTime(now.year - 1, now.month, now.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) || initial.isAfter(last) ? DateTime(now.year - 25) : initial,
      firstDate: first,
      lastDate: last,
      helpText: 'Date of birth',
    );
    if (picked != null && mounted) setState(() => _birthday = picked);
  }

  Future<void> _pickPhoto() async {
    final x = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 1280,
      maxHeight: 1280,
      imageQuality: 82,
    );
    if (x != null && mounted) setState(() => _photoFile = x);
  }

  Future<String> _photoDataUrl() async {
    final f = _photoFile;
    if (f == null) throw StateError('Profile picture is required');
    final bytes = await f.readAsBytes();
    if (bytes.length > 280_000) {
      throw StateError('Photo file is too large. Pick a smaller image (under ~250KB).');
    }
    var mime = f.mimeType?.toLowerCase();
    if (mime != 'image/png' && mime != 'image/webp') {
      mime = 'image/jpeg';
    }
    return 'data:$mime;base64,${base64Encode(bytes)}';
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    fullName.dispose();
    phone.dispose();
    streetPurok.dispose();
    medicalConditions.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      if (_birthday == null) {
        throw StateError('Date of birth is required');
      }
      if (barangayId.isEmpty) {
        throw StateError('Barangay is required');
      }
      if (_photoFile == null) {
        throw StateError('Profile picture is required');
      }
      final photoUrl = await _photoDataUrl();
      final dobStr = DateFormat('yyyy-MM-dd').format(_birthday!);
      await ref.read(authRepositoryProvider).register(
            email: email.text.trim(),
            password: password.text,
            fullName: fullName.text.trim(),
            phone: phone.text.trim(),
            birthday: dobStr,
            gender: _gender,
            bloodType: _bloodType,
            medicalConditions: medicalConditions.text.trim(),
            streetPurok: streetPurok.text.trim(),
            barangaySelection: barangayId,
            profilePhotoUrl: photoUrl,
          );
      if (!mounted) return;
      gCitizenStore?.profileComplete = true;
      final store = gCitizenStore;
      final next = (store?.onboardingDone == true) ? Routes.home : Routes.onboarding;
      Navigator.of(context).pushReplacementNamed(next);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final age = _ageFromDob();
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
                errorBuilder: (_, __, ___) =>
                    Icon(Icons.shield_outlined, size: 72, color: scheme.primary),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'All fields are required. Password: 12+ characters. Phone: E.164 (e.g. +639171234567).',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: fullName,
            decoration: const InputDecoration(labelText: 'Full name *'),
            textCapitalization: TextCapitalization.words,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: loading ? null : _pickDob,
                  icon: const Icon(Icons.calendar_today, size: 18),
                  label: Text(
                    _birthday == null ? 'Date of birth *' : DateFormat.yMMMd().format(_birthday!),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Age',
                    border: OutlineInputBorder(),
                  ),
                  child: Text(
                    age == null ? '—' : '$age',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _gender,
            decoration: const InputDecoration(labelText: 'Gender *'),
            items: _genders
                .map((g) => DropdownMenuItem(value: g.value, child: Text(g.label)))
                .toList(),
            onChanged: loading ? null : (v) => setState(() => _gender = v ?? 'MALE'),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _bloodType,
            decoration: const InputDecoration(labelText: 'Blood type *'),
            isExpanded: true,
            items: _bloodTypes
                .map((b) => DropdownMenuItem(value: b.value, child: Text(b.label)))
                .toList(),
            onChanged: loading ? null : (v) => setState(() => _bloodType = v ?? 'O_POS'),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: medicalConditions,
            decoration: const InputDecoration(
              labelText: 'Medical issues / conditions *',
              alignLabelWithHint: true,
            ),
            maxLines: 4,
            minLines: 3,
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: streetPurok,
            decoration: const InputDecoration(
              labelText: 'Street / purok *',
              hintText: 'e.g. Purok 3, Malamawi Road',
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(controller: email, decoration: const InputDecoration(labelText: 'Email *')),
          const SizedBox(height: 8),
          TextFormField(
            controller: phone,
            decoration: const InputDecoration(labelText: 'Contact number * (+63…)'),
            keyboardType: TextInputType.phone,
          ),
          if (_barangaysLoading)
            const Padding(
              padding: EdgeInsets.only(top: 8, bottom: 8),
              child: LinearProgressIndicator(minHeight: 2),
            ),
          if (_barangaysLoadError != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                _barangaysLoadError!,
                style: TextStyle(color: scheme.error, fontSize: 12),
              ),
            ),
          DropdownButtonFormField<String?>(
            key: const ValueKey<String>('register_barangay_dropdown'),
            value: _barangayDropdownValue(),
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Barangay *'),
            items: barangays
                .map(
                  (b) => DropdownMenuItem<String?>(
                    value: b.id,
                    child: Text(b.name, overflow: TextOverflow.ellipsis),
                  ),
                )
                .toList(),
            onChanged: _barangaysLoading ? null : (String? v) => setState(() => barangayId = v ?? ''),
          ),
          const SizedBox(height: 12),
          Text('Profile picture *', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 6),
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: _photoFile == null
                    ? Container(
                        width: 72,
                        height: 72,
                        color: scheme.surfaceContainerHighest,
                        alignment: Alignment.center,
                        child: Icon(Icons.person, color: scheme.onSurfaceVariant),
                      )
                    : FutureBuilder<Uint8List>(
                        future: _photoFile!.readAsBytes(),
                        builder: (context, snap) {
                          final b = snap.data;
                          if (b == null) {
                            return const SizedBox(
                              width: 72,
                              height: 72,
                              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          }
                          return Image.memory(b, width: 72, height: 72, fit: BoxFit.cover);
                        },
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: loading ? null : _pickPhoto,
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Choose from gallery'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: password,
            decoration: const InputDecoration(labelText: 'Password * (min 12 characters)'),
            obscureText: true,
          ),
          if (error != null) ...[
            const SizedBox(height: 8),
            Text(error!, style: TextStyle(color: scheme.error, fontSize: 13)),
          ],
          const SizedBox(height: 16),
          FilledButton(onPressed: loading ? null : _submit, child: const Text('Create account')),
        ],
      ),
    );
  }
}
