import 'package:flutter/material.dart';

/// Full-screen HUD-style backdrop (drawn behind all routes).
class FuturisticBackgroundLayer extends StatelessWidget {
  const FuturisticBackgroundLayer({super.key});

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.of(context).disableAnimations;
    return RepaintBoundary(
      child: CustomPaint(
        painter: _FuturisticBgPainter(reducedMotion: reduced),
        child: const SizedBox.expand(),
      ),
    );
  }
}

class _FuturisticBgPainter extends CustomPainter {
  _FuturisticBgPainter({required this.reducedMotion});

  final bool reducedMotion;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    const base = Color(0xFF020208);
    canvas.drawRect(rect, Paint()..color = base);

    void glow(Offset c, double radius, Color a, Color b) {
      final paint = Paint()
        ..shader = RadialGradient(
          colors: [a, b],
          stops: const [0.0, 1.0],
        ).createShader(Rect.fromCircle(center: c, radius: radius));
      canvas.drawRect(rect, paint);
    }

    glow(
      Offset(size.width * 0.12, -size.height * 0.02),
      size.shortestSide * 0.72,
      const Color(0xFFe11d48).withValues(alpha: reducedMotion ? 0.18 : 0.26),
      Colors.transparent,
    );
    glow(
      Offset(size.width * 0.92, size.height * 0.1),
      size.shortestSide * 0.55,
      const Color(0xFF06b6d4).withValues(alpha: 0.12),
      Colors.transparent,
    );
    glow(
      Offset(size.width * 0.45, size.height * 1.02),
      size.shortestSide * 0.65,
      const Color(0xFF8b5cf6).withValues(alpha: 0.14),
      Colors.transparent,
    );

    final grid = Paint()
      ..color = const Color(0xFFFFFFFF).withValues(alpha: 0.028)
      ..strokeWidth = 1;
    const step = 32.0;
    for (var x = 0.0; x <= size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (var y = 0.0; y <= size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final scan = Paint()
      ..color = const Color(0xFFFFFFFF).withValues(alpha: reducedMotion ? 0.01 : 0.018)
      ..strokeWidth = 1;
    for (var i = -size.height; i < size.width + size.height; i += 6) {
      canvas.drawLine(Offset(i.toDouble(), 0), Offset(i + size.height, size.height), scan);
    }
  }

  @override
  bool shouldRepaint(covariant _FuturisticBgPainter oldDelegate) =>
      oldDelegate.reducedMotion != reducedMotion;
}
