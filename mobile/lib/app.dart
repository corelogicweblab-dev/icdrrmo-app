import 'package:flutter/material.dart';

import 'core/bootstrap/global_store.dart';
import 'core/theme/futuristic_background_layer.dart';
import 'core/navigation/app_navigator_key.dart';
import 'core/navigation/routes.dart';
import 'features/auth/presentation/forgot_password_screen.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/auth/presentation/register_screen.dart';
import 'features/auth/presentation/role_gateway_screen.dart';
import 'features/communications/emergency_communications_screen.dart';
import 'features/contacts/emergency_contacts_screen.dart';
import 'features/onboarding/presentation/onboarding_screen.dart';
import 'features/profile/presentation/profile_setup_screen.dart';
import 'features/settings/settings_screen.dart';
import 'features/safety/safety_guide_screen.dart';
import 'features/shell/citizen_main_shell.dart';
import 'features/splash/presentation/splash_screen.dart';
import 'features/tracking/presentation/incident_tracking_screen.dart';

class IcdrrmoApp extends StatelessWidget {
  const IcdrrmoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: appNavigatorKey,
      title: 'ICDRRMO Citizen',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFB91C1C), brightness: Brightness.dark),
        useMaterial3: true,
        canvasColor: Colors.transparent,
        scaffoldBackgroundColor: Colors.transparent,
        popupMenuTheme: const PopupMenuThemeData(
          color: Color(0xFF27272a),
          surfaceTintColor: Colors.transparent,
          textStyle: TextStyle(color: Color(0xFFfafafa), fontSize: 14),
        ),
      ),
      builder: (context, child) {
        final store = gCitizenStore;
        var scale = 1.0;
        if (store?.largeText == true) scale *= 1.18;
        if (store?.seniorMode == true) scale *= 1.06;
        final mq = MediaQuery.of(context);
        final themed = child ?? const SizedBox.shrink();
        return MediaQuery(
          data: mq.copyWith(textScaler: TextScaler.linear(scale)),
          child: Stack(
            fit: StackFit.expand,
            clipBehavior: Clip.none,
            children: [
              const FuturisticBackgroundLayer(),
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: themed),
                  SafeArea(
                    top: false,
                    minimum: const EdgeInsets.only(bottom: 4),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                      child: Text(
                        'Powered by: CoreLogic',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.9),
                              letterSpacing: 0.4,
                            ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
      initialRoute: Routes.gateway,
      routes: {
        Routes.gateway: (_) => const RoleGatewayScreen(),
        Routes.splash: (_) => const SplashScreen(),
        Routes.login: (_) => const LoginScreen(),
        Routes.register: (_) => const RegisterScreen(),
        Routes.forgotPassword: (_) => const ForgotPasswordScreen(),
        Routes.profileSetup: (_) => const ProfileSetupScreen(),
        Routes.home: (_) => const CitizenMainShell(),
        Routes.settings: (_) => const SettingsScreen(),
        Routes.guide: (_) => const SafetyGuideScreen(),
        Routes.emergencyContacts: (_) => const EmergencyContactsScreen(),
        Routes.communications: (_) => const EmergencyCommunicationsScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == Routes.track) {
          final id = settings.arguments as String?;
          if (id != null && id.isNotEmpty) {
            return MaterialPageRoute<void>(builder: (_) => IncidentTrackingScreen(incidentId: id));
          }
        }
        return null;
      },
    );
  }
}
