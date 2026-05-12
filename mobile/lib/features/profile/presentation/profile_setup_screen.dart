import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';
import '../../../core/network/dio_provider.dart';
import '../../auth/data/barangays_repository.dart';

const _bloodTypeValues = <String>[
  'UNKNOWN',
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'O_POS',
  'O_NEG',
  'AB_POS',
  'AB_NEG',
];

/// Medical readiness profile — required before home dashboard per spec.
class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final fullName = TextEditingController();
  final address = TextEditingController();
  final streetPurok = TextEditingController();
  final allergies = TextEditingController();
  final medical = TextEditingController();
  final disabilities = TextEditingController();
  final maintenanceMeds = TextEditingController();
  DateTime? birthday;
  String gender = 'MALE';
  String blood = 'UNKNOWN';
  final ec1Name = TextEditingController();
  final ec1Phone = TextEditingController();
  final ec2Name = TextEditingController();
  final ec2Phone = TextEditingController();
  bool senior = false;
  bool pregnant = false;
  String? idPath;
  String? photoPath;
  bool saving = false;
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
      final list = await ref.read(barangaysRepositoryProvider).fetchPreferringAuthSession();
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

  /// Value must exist in [items] or DropdownButton asserts / shows blank.
  String? _barangayDropdownValue() {
    if (barangayId.isEmpty) return null;
    return barangays.any((b) => b.id == barangayId) ? barangayId : null;
  }

  String? _barangayNameForId(String id) {
    for (final b in barangays) {
      if (b.id == id) return b.name;
    }
    return null;
  }

  String _emergencyNotesForApi() {
    final parts = <String>[
      if (disabilities.text.trim().isNotEmpty) 'Disabilities: ${disabilities.text.trim()}',
      if (maintenanceMeds.text.trim().isNotEmpty) 'Maintenance meds: ${maintenanceMeds.text.trim()}',
      'Senior: $senior, Pregnant: $pregnant',
      'EC1: ${ec1Name.text.trim()} ${ec1Phone.text.trim()}',
      if (ec2Name.text.trim().isNotEmpty) 'EC2: ${ec2Name.text.trim()} ${ec2Phone.text.trim()}',
    ];
    final s = parts.join('\n');
    return s.length > 3800 ? s.substring(0, 3800) : s;
  }

  @override
  void dispose() {
    fullName.dispose();
    address.dispose();
    streetPurok.dispose();
    allergies.dispose();
    medical.dispose();
    disabilities.dispose();
    maintenanceMeds.dispose();
    ec1Name.dispose();
    ec1Phone.dispose();
    ec2Name.dispose();
    ec2Phone.dispose();
    super.dispose();
  }

  Future<void> _pick(bool id) async {
    final p = ImagePicker();
    final f = await p.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: (gCitizenStore?.lowBandwidthMode ?? false) ? 55 : 85,
    );
    if (f != null) setState(() => id ? idPath = f.path : photoPath = f.path);
  }

  Future<void> _save() async {
    final store = gCitizenStore;
    if (store == null) return;

    final missing = <String>[
      if (fullName.text.trim().isEmpty) 'Full name',
      if (birthday == null) 'Birthday',
      if (address.text.trim().isEmpty) 'Address',
      if (barangayId.isEmpty) 'Barangay',
      if (allergies.text.trim().isEmpty) 'Allergies',
      if (medical.text.trim().isEmpty) 'Medical conditions',
      if (ec1Name.text.trim().isEmpty || ec1Phone.text.trim().isEmpty) 'Emergency contact 1',
    ];
    if (idPath == null || idPath!.isEmpty) missing.add('Valid ID capture');
    if (photoPath == null || photoPath!.isEmpty) missing.add('Profile photo');

    if (missing.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Complete required fields: ${missing.join(', ')}')),
      );
      return;
    }

    setState(() => saving = true);

    await store.saveProfileMap({
      'fullName': fullName.text.trim(),
      'birthday': birthday!.toIso8601String().split('T').first,
      'gender': gender,
      'address': address.text.trim(),
      'barangayId': barangayId,
      'barangayName': _barangayNameForId(barangayId),
      'streetPurok': streetPurok.text.trim(),
      'bloodType': blood,
      'allergies': allergies.text.trim(),
      'medicalConditions': medical.text.trim(),
      'emergencyContacts': [
        {'fullName': ec1Name.text.trim(), 'phone': ec1Phone.text.trim()},
        if (ec2Name.text.trim().isNotEmpty && ec2Phone.text.trim().isNotEmpty)
          {'fullName': ec2Name.text.trim(), 'phone': ec2Phone.text.trim()},
      ],
      'validIdPhotoPath': idPath,
      'profilePhotoPath': photoPath,
      'disabilities': disabilities.text.trim(),
      'maintenanceMedicines': maintenanceMeds.text.trim(),
      'seniorCitizen': senior,
      'pregnantIndicator': pregnant,
    });

    try {
      final dio = ref.read(dioProvider);
      final notes = _emergencyNotesForApi();
      await dio.patch<dynamic>(
        '/users/me',
        data: <String, dynamic>{
          'fullName': fullName.text.trim(),
          'gender': gender,
          'address': address.text.trim(),
          ...barangayProfilePatchFields(barangayId),
          'streetPurok': streetPurok.text.trim().isEmpty ? null : streetPurok.text.trim(),
          'bloodType': blood,
          'allergies': allergies.text.trim(),
          'medicalConditions': medical.text.trim(),
          if (notes.isNotEmpty) 'emergencyNotes': notes,
        },
      );
    } on DioException catch (e) {
      if (mounted) {
        final msg = e.response?.data?.toString() ?? e.message ?? e.toString();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved locally; API sync failed: $msg')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved locally; API sync failed: $e')),
        );
      }
    }

    store.profileComplete = true;
    if (mounted) {
      Navigator.of(context).pushReplacementNamed(Routes.home);
    }
    setState(() => saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Required medical & identity context for responders', style: Theme.of(context).textTheme.titleSmall),
          const SizedBox(height: 12),
          TextField(controller: fullName, decoration: const InputDecoration(labelText: 'Full name *')),
          ListTile(
            title: const Text('Birthday *'),
            subtitle: Text(birthday == null ? 'Select' : DateFormat.yMMMd().format(birthday!)),
            onTap: () async {
              final now = DateTime.now();
              final d = await showDatePicker(
                context: context,
                initialDate: DateTime(now.year - 21),
                firstDate: DateTime(1900),
                lastDate: now,
              );
              if (d != null) setState(() => birthday = d);
            },
          ),
          DropdownButtonFormField<String>(
            key: ValueKey<String>('prof_gender_$gender'),
            value: gender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const <DropdownMenuItem<String>>[
              DropdownMenuItem(value: 'UNSPECIFIED', child: Text('Unspecified')),
              DropdownMenuItem(value: 'MALE', child: Text('Male')),
              DropdownMenuItem(value: 'FEMALE', child: Text('Female')),
              DropdownMenuItem(value: 'OTHER', child: Text('Other')),
              DropdownMenuItem(value: 'PREFER_NOT_SAY', child: Text('Prefer not to say')),
            ],
            onChanged: (String? v) => setState(() => gender = v ?? 'MALE'),
          ),
          TextField(controller: address, decoration: const InputDecoration(labelText: 'Address *')),
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
            key: const ValueKey<String>('profile_barangay_dropdown'),
            value: _barangayDropdownValue(),
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Barangay *'),
            items: [
              DropdownMenuItem<String?>(
                value: null,
                child: Text(
                  '— Select barangay —',
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
            onChanged: _barangaysLoading
                ? null
                : (String? v) => setState(() => barangayId = v ?? ''),
          ),
          TextField(
            controller: streetPurok,
            decoration: const InputDecoration(
              labelText: 'Street / purok (optional)',
              hintText: 'e.g. Purok 3, Malamawi Road',
            ),
          ),
          DropdownButtonFormField<String>(
            key: ValueKey<String>('prof_blood_$blood'),
            value: blood,
            decoration: const InputDecoration(labelText: 'Blood type'),
            items: _bloodTypeValues
                .map(
                  (String e) => DropdownMenuItem<String>(
                    value: e,
                    child: Text(e.replaceAll('_', ' ')),
                  ),
                )
                .toList(),
            onChanged: (String? v) => setState(() => blood = v ?? 'UNKNOWN'),
          ),
          TextField(controller: allergies, decoration: const InputDecoration(labelText: 'Allergies *')),
          TextField(controller: medical, maxLines: 2, decoration: const InputDecoration(labelText: 'Medical conditions *')),
          const Divider(height: 32),
          TextField(controller: ec1Name, decoration: const InputDecoration(labelText: 'Emergency contact 1 · name *')),
          TextField(controller: ec1Phone, decoration: const InputDecoration(labelText: 'Emergency contact 1 · phone *')),
          TextField(controller: ec2Name, decoration: const InputDecoration(labelText: 'Emergency contact 2 · name')),
          TextField(controller: ec2Phone, decoration: const InputDecoration(labelText: 'Emergency contact 2 · phone')),
          const Divider(height: 32),
          ListTile(title: const Text('Valid ID photo *'), subtitle: Text(idPath ?? 'Not set'), trailing: IconButton(icon: const Icon(Icons.camera_alt), onPressed: () => _pick(true))),
          ListTile(title: const Text('Profile photo *'), subtitle: Text(photoPath ?? 'Not set'), trailing: IconButton(icon: const Icon(Icons.face), onPressed: () => _pick(false))),
          TextField(controller: disabilities, decoration: const InputDecoration(labelText: 'Disabilities (optional)')),
          TextField(controller: maintenanceMeds, decoration: const InputDecoration(labelText: 'Maintenance medicines')),
          CheckboxListTile(
            value: senior,
            title: const Text('Senior citizen'),
            onChanged: (bool? v) => setState(() => senior = v ?? false),
          ),
          CheckboxListTile(
            value: pregnant,
            title: const Text('Pregnant indicator'),
            onChanged: (bool? v) => setState(() => pregnant = v ?? false),
          ),
          const SizedBox(height: 20),
          FilledButton(onPressed: saving ? null : _save, child: Text(saving ? 'Saving…' : 'Complete & enter dashboard')),
        ],
      ),
    );
  }
}
