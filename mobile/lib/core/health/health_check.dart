import 'package:dio/dio.dart';

import '../config/api_config.dart';

Future<bool> pingServerReachable(Dio dio) async {
  try {
    /// Nest ready probe (same shape as Next admin rewrite target).
    final base = ApiConfig.restBase.replaceAll(RegExp(r'/+$'), '');
    final r = await dio.get<String>('$base/health/ready', options: Options(validateStatus: (_) => true));
    return r.statusCode != null && r.statusCode! < 500 && (r.statusCode == 200);
  } catch (_) {
    return false;
  }
}
