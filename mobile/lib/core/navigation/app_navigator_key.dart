import 'package:flutter/material.dart';

/// Wired to [MaterialApp.navigatorKey] — navigate after `await` without using [BuildContext].
final GlobalKey<NavigatorState> appNavigatorKey = GlobalKey<NavigatorState>();
