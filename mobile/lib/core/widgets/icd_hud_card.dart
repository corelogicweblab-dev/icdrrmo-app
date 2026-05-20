import 'package:flutter/material.dart';

import '../theme/icd_colors.dart';

/// Panel with orange/red HUD corner accents (matches web `icd-hud-card`).
class IcdHudCard extends StatelessWidget {
  const IcdHudCard({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  final Widget child;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0x59F97316)),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xF5120A06), Color(0xFA030303)],
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x1FF97316), blurRadius: 48, spreadRadius: -8),
          BoxShadow(color: Color(0x66000000), blurRadius: 32, offset: Offset(0, 16)),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            top: 10,
            left: 10,
            child: _CornerMark(top: true, left: true),
          ),
          Positioned(
            right: 10,
            bottom: 10,
            child: _CornerMark(top: false, left: false),
          ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}

class _CornerMark extends StatelessWidget {
  const _CornerMark({required this.top, required this.left});

  final bool top;
  final bool left;

  @override
  Widget build(BuildContext context) {
    final color = top ? IcdColors.orange : IcdColors.red;
    return SizedBox(
      width: 18,
      height: 18,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            top: top ? BorderSide(color: color, width: 2) : BorderSide.none,
            left: left ? BorderSide(color: color, width: 2) : BorderSide.none,
            right: !left ? BorderSide(color: color, width: 2) : BorderSide.none,
            bottom: !top ? BorderSide(color: color, width: 2) : BorderSide.none,
          ),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.45),
              blurRadius: 10,
              spreadRadius: -2,
            ),
          ],
        ),
      ),
    );
  }
}
