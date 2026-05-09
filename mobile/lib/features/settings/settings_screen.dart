import 'package:flutter/material.dart';
import '../../core/bootstrap/global_store.dart';

/// Low bandwidth, accessibility, sounds, language stubs.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    final s = gCitizenStore;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          SwitchListTile(
            title: const Text('Low bandwidth mode'),
            subtitle: const Text('Compressed imagery + reduced GPS sampling on SOS'),
            value: s?.lowBandwidthMode ?? false,
            onChanged: (v) {
              s?.lowBandwidthMode = v;
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Accessibility · large text'),
            value: s?.largeText ?? false,
            onChanged: (v) {
              s?.largeText = v;
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Senior citizen mode'),
            value: s?.seniorMode ?? false,
            onChanged: (v) {
              s?.seniorMode = v;
              setState(() {});
            },
          ),
          SwitchListTile(
            title: const Text('Color blind friendly palette'),
            value: s?.colorBlindSafe ?? false,
            onChanged: (v) {
              s?.colorBlindSafe = v;
              setState(() {});
            },
          ),
          const ListTile(title: Text('Language'), subtitle: Text('English (Tagalog pack — future localization table)')),
          const ListTile(title: Text('Emergency sound profile'), subtitle: Text('Wire custom alarm assets + haptics')),
        ],
      ),
    );
  }
}
