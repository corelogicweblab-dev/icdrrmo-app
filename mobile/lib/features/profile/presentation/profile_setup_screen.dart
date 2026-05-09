import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';

/// Medical readiness profile — required before home dashboard per spec.
class ProfileSetupScreen extends ConsumerStatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  ConsumerState<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends ConsumerState<ProfileSetupScreen> {
  final fullName = TextEditingController();
  final address = TextEditingController();
  final barangay = TextEditingController();
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

  @override
  void dispose() {
    fullName.dispose();
    address.dispose();
    barangay.dispose();
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
      if (barangay.text.trim().isEmpty) 'Barangay',
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
      'barangayId': barangay.text.trim(),
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
            value: gender,
            decoration: const InputDecoration(labelText: 'Gender'),
            items: const [
              DropdownMenuItem(value: 'UNSPECIFIED', child: Text('Unspecified')),
              DropdownMenuItem(value: 'MALE', child: Text('Male')),
              DropdownMenuItem(value: 'FEMALE', child: Text('Female')),
              DropdownMenuItem(value: 'OTHER', child: Text('Other')),
              DropdownMenuItem(value: 'PREFER_NOT_SAY', child: Text('Prefer not to say')),
            ],
            onChanged: (v) => setState(() => gender = v ?? 'MALE'),
          ),
          TextField(controller: address, decoration: const InputDecoration(labelText: 'Address *')),
          TextField(controller: barangay, decoration: const InputDecoration(labelText: 'Barangay *')),
          DropdownButtonFormField<String>(
            value: blood,
            decoration: const InputDecoration(labelText: 'Blood type'),
            items: const [
              'UNKNOWN',
              'A_POS',
              'A_NEG',
              'B_POS',
              'B_NEG',
              'O_POS',
              'O_NEG',
              'AB_POS',
              'AB_NEG',
            ].map((e) => DropdownMenuItem(value: e, child: Text(e.replaceAll('_', ' ')))).toList(),
            onChanged: (v) => setState(() => blood = v ?? 'UNKNOWN'),
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
          CheckboxListTile(value: senior, title: const Text('Senior citizen'), onChanged: (v) => setState(() => senior = v ?? false)),
          CheckboxListTile(value: pregnant, title: const Text('Pregnant indicator'), onChanged: (v) => setState(() => pregnant = v ?? false)),
          const SizedBox(height: 20),
          FilledButton(onPressed: saving ? null : _save, child: Text(saving ? 'Saving…' : 'Complete & enter dashboard')),
        ],
      ),
    );
  }
}
