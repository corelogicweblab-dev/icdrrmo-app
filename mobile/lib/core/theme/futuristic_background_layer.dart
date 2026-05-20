import 'package:flutter/material.dart';

import 'icd_colors.dart';

/// Full-screen orange/red/black HUD backdrop (drawn behind all routes).
class FuturisticBackgroundLayer extends StatelessWidget {
  const FuturisticBackgroundLayer({super.key});

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    return RepaintBoundary(
      child: CustomPaint(
        painter: _IcdBackdropPainter(reducedMotion: reduced),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _IcdBackdropPainter extends CustomPainter {
  _IcdBackdropPainter({required this.reducedMotion});

  final bool reducedMotion;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(rect, Paint()..color = IcdColors.black);

    void glow(Offset c, double radius, Color a) {
      final paint = Paint()
        ..shader = RadialGradient(colors: [a, Colors.transparent], stops: const [0.0, 1.0])
            .createShader(Rect.fromCircle(center: c, radius: radius));
      canvas.drawRect(rect, paint);
    }

    final o = reducedMotion ? 0.22 : 0.38;
    final r = reducedMotion ? 0.18 : 0.32;
    glow(Offset(size.width * 0.1, -size.height * 0.05), size.shortestSide * 0.75, IcdColors.orange.withValues(alpha: o));
    glow(Offset(size.width * 0.95, size.height * 0.08), size.shortestSide * 0.6, IcdColors.red.withValues(alpha: r));
    glow(Offset(size.width * 0.5, size.height * 1.05), size.shortestSide * 0.7, IcdColors.orangeDim.withValues(alpha: o * 0.65));

    final grid = Paint()
      ..color = IcdColors.gridLine
      ..strokeWidth = 1;
    const step = 36.0;
    for (var x = 0.0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (var y = 0.0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final scan = Paint()
      ..color = IcdColors.orange.withValues(alpha: reducedMotion ? 0.04 : 0.07)
      ..strokeWidth = 1;
    for (var i = -size.height; i < size.width + size.height; i += 8) {
      canvas.drawLine(Offset(i.toDouble(), 0), Offset(i + size.height, size.height), scan);
    }
  }

  @override
  bool shouldRepaint(covariant _IcdBackdropPainter oldDelegate) =>
      oldDelegate.reducedMotion != reducedMotion;
}
