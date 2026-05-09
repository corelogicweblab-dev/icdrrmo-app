import 'dart:io';

import 'package:telephony/telephony.dart';

/// Low-bandwidth SMS lane — requires Android SMS permission + device SMS app.
/// **Shortcode / gateway number** must be configured for your LGU deployment.
abstract final class SmsGatewayConfig {
  /// Replace with city hotline / modem inbox number.
  static const String targetNumber = String.fromEnvironment(
    'SMS_GATEWAY',
    defaultValue: '+639000000000',
  );
}

Future<bool> sendSosSms(String body) async {
  if (!Platform.isAndroid) return false;
  try {
    final telephony = Telephony.instance;
    await telephony.sendSms(to: SmsGatewayConfig.targetNumber, message: body);
    return true;
  } catch (_) {
    return false;
  }
}
