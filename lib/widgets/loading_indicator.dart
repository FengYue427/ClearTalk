import 'package:flutter/material.dart';

/// 带文字的高级加载指示器
class LoadingIndicator extends StatelessWidget {
  final String? text;
  final double size;
  final Color? color;

  const LoadingIndicator({
    super.key,
    this.text,
    this.size = 48,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final themeColor = color ?? const Color(0xFF5B8DEF);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            valueColor: AlwaysStoppedAnimation<Color>(themeColor),
          ),
        ),
        if (text != null) ...[
          const SizedBox(height: 16),
          Text(
            text!,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
        ],
      ],
    );
  }
}

/// 全屏加载遮罩
class FullScreenLoading extends StatelessWidget {
  final String? text;
  final bool isLoading;
  final Widget child;

  const FullScreenLoading({
    super.key,
    this.text,
    this.isLoading = true,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        child,
        if (isLoading)
          Container(
            color: Colors.white.withOpacity(0.85),
            child: Center(
              child: LoadingIndicator(text: text),
            ),
          ),
      ],
    );
  }
}

/// 带脉冲动画的加载点
class PulsingDots extends StatefulWidget {
  final int count;
  final double size;
  final Color? color;

  const PulsingDots({
    super.key,
    this.count = 3,
    this.size = 8,
    this.color,
  });

  @override
  State<PulsingDots> createState() => _PulsingDotsState();
}

class _PulsingDotsState extends State<PulsingDots>
    with TickerProviderStateMixin {
  late List<AnimationController> _controllers;
  late List<Animation<double>> _animations;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
      widget.count,
      (index) => AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 600),
      ),
    );

    _animations = _controllers.map((controller) {
      return Tween<double>(begin: 0.3, end: 1.0).animate(
        CurvedAnimation(parent: controller, curve: Curves.easeInOut),
      );
    }).toList();

    // 依次启动动画
    for (int i = 0; i < widget.count; i++) {
      Future.delayed(Duration(milliseconds: i * 150), () {
        if (mounted) {
          _controllers[i].repeat(reverse: true);
        }
      });
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = widget.color ?? const Color(0xFF5B8DEF);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(widget.count, (index) {
        return AnimatedBuilder(
          animation: _animations[index],
          builder: (context, child) {
            return Container(
              width: widget.size,
              height: widget.size,
              margin: EdgeInsets.symmetric(horizontal: widget.size / 4),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: themeColor.withOpacity(_animations[index].value),
              ),
            );
          },
        );
      }),
    );
  }
}

/// 生成中加载指示器（带脉冲动画）
class GeneratingIndicator extends StatelessWidget {
  final String text;

  const GeneratingIndicator({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const PulsingDots(count: 3, size: 10),
          const SizedBox(height: 12),
          Text(
            text,
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
