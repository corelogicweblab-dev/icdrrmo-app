import 'package:flutter/material.dart';

import 'icd_colors.dart';

abstract final class IcdTheme {
  static ThemeData build() {
    const scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: IcdColors.orange,
      onPrimary: IcdColors.white,
      secondary: IcdColors.red,
      onSecondary: IcdColors.white,
      surface: IcdColors.blackElevated,
      onSurface: IcdColors.white,
      error: IcdColors.red,
      onError: IcdColors.white,
      tertiary: IcdColors.orangeGlow,
      onTertiary: IcdColors.black,
      surfaceContainerHighest: Color(0xFF18181B),
      onSurfaceVariant: IcdColors.zinc400,
      outline: Color(0x40F97316),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: Colors.transparent,
      canvasColor: Colors.transparent,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xE6030303),
        foregroundColor: IcdColors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          fontSize: 17,
          fontWeight: FontWeight.w600,
          color: IcdColors.white,
          letterSpacing: -0.2,
        ),
      ),
      cardTheme: CardThemeData(
        color: const Color(0xF00C0806),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0x59F97316)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x8C000000),
        labelStyle: const TextStyle(color: IcdColors.zinc400, fontSize: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0x59F97316)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0x59F97316)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: IcdColors.orange, width: 1.5),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: IcdColors.orangeDim,
          foregroundColor: IcdColors.white,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
        ).copyWith(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return IcdColors.zinc600;
            return null;
          }),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: IcdColors.orangeGlow),
      ),
      dividerColor: const Color(0x33F97316),
      popupMenuTheme: const PopupMenuThemeData(
        color: Color(0xFF0C0C0C),
        surfaceTintColor: Colors.transparent,
        textStyle: TextStyle(color: IcdColors.white, fontSize: 14),
      ),
      textTheme: const TextTheme(
        headlineSmall: TextStyle(
          fontWeight: FontWeight.w700,
          color: IcdColors.white,
          letterSpacing: -0.3,
        ),
        titleLarge: TextStyle(fontWeight: FontWeight.w600, color: IcdColors.white),
        bodyMedium: TextStyle(color: IcdColors.zinc400, height: 1.45),
        labelSmall: TextStyle(
          fontWeight: FontWeight.w700,
          letterSpacing: 2.5,
          color: IcdColors.orangeGlow,
        ),
      ),
    );
  }
}
