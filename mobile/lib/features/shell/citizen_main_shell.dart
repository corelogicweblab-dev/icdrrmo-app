import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/bootstrap/global_store.dart';
import '../../../core/navigation/routes.dart';
import '../../auth/data/auth_repository.dart';
import '../alerts/alerts_hub_page.dart';
import '../home/home_dashboard_page.dart';
import '../history/incident_archive_page.dart';
import '../map/evac_map_page.dart';
import '../profile/profile_overview_tab.dart';

/// Bottom navigation: Home · Incidents · Map · Alerts · Profile
class CitizenMainShell extends ConsumerStatefulWidget {
  const CitizenMainShell({super.key});

  @override
  ConsumerState<CitizenMainShell> createState() => _CitizenMainShellState();
}

class _CitizenMainShellState extends ConsumerState<CitizenMainShell> {
  int index = 0;

  List<Widget> _pages(BuildContext context) => [
        const HomeDashboardPage(),
        const IncidentArchivePage(),
        const EvacMapPage(),
        const AlertsHubPage(),
        ProfileOverviewTab(onOpenSettings: () => Navigator.of(context).pushNamed(Routes.settings)),
      ];

  Future<void> _logout() async {
    await ref.read(authRepositoryProvider).logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil(Routes.login, (r) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('ICDRRMO Citizen'),
        actions: [
          IconButton(icon: const Icon(Icons.menu_book_outlined), onPressed: () => Navigator.pushNamed(context, Routes.guide)),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          children: [
            const DrawerHeader(child: Text('Emergency tools')),
            ListTile(title: const Text('Safety guides (offline)'), onTap: () { Navigator.pop(context); Navigator.pushNamed(context, Routes.guide); }),
            ListTile(title: const Text('Emergency contacts'), onTap: () { Navigator.pop(context); Navigator.pushNamed(context, Routes.emergencyContacts); }),
            ListTile(title: const Text('Communication panel'), onTap: () { Navigator.pop(context); Navigator.pushNamed(context, Routes.communications); }),
            ListTile(title: const Text('Settings'), onTap: () { Navigator.pop(context); Navigator.pushNamed(context, Routes.settings); }),
            ListTile(title: const Text('Log out'), onTap: () { Navigator.pop(context); _logout(); }),
          ],
        ),
      ),
      body: IndexedStack(index: index, children: _pages(context)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) => setState(() => index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.history_outlined), selectedIcon: Icon(Icons.history), label: 'Incidents'),
          NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map), label: 'Map'),
          NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications), label: 'Alerts'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
