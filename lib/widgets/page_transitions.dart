import 'package:flutter/material.dart';

/// 页面过渡动画
class PageTransitions {
  /// 滑动进入（从右到左）
  static Widget slideFromRight(Widget child, Animation<double> animation) {
    final tween = Tween<Offset>(
      begin: const Offset(1, 0),
      end: Offset.zero,
    ).chain(CurveTween(curve: Curves.easeInOutCubic));

    return SlideTransition(
      position: animation.drive(tween),
      child: child,
    );
  }

  /// 滑动进入（从底部）
  static Widget slideFromBottom(Widget child, Animation<double> animation) {
    final tween = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).chain(CurveTween(curve: Curves.easeOutCubic));

    return SlideTransition(
      position: animation.drive(tween),
      child: child,
    );
  }

  /// 淡入
  static Widget fade(Widget child, Animation<double> animation) {
    return FadeTransition(
      opacity: animation,
      child: child,
    );
  }

  /// 缩放淡入
  static Widget scaleFade(Widget child, Animation<double> animation) {
    final scaleTween = Tween<double>(begin: 0.95, end: 1.0)
        .chain(CurveTween(curve: Curves.easeOutCubic));

    return FadeTransition(
      opacity: animation,
      child: ScaleTransition(
        scale: animation.drive(scaleTween),
        child: child,
      ),
    );
  }
}

/// 带进入动画的页面包装器
class AnimatedPageWrapper extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final Curve curve;

  const AnimatedPageWrapper({
    super.key,
    required this.child,
    this.duration = const Duration(milliseconds: 300),
    this.curve = Curves.easeInOut,
  });

  @override
  State<AnimatedPageWrapper> createState() => _AnimatedPageWrapperState();
}

class _AnimatedPageWrapperState extends State<AnimatedPageWrapper>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _animation = CurvedAnimation(
      parent: _controller,
      curve: widget.curve,
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PageTransitions.slideFromRight(widget.child, _animation);
  }
}

/// 自定义路由 - 滑动进入
class SlidePageRoute<T> extends PageRouteBuilder<T> {
  final Widget page;

  SlidePageRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return PageTransitions.slideFromRight(child, animation);
          },
          transitionDuration: const Duration(milliseconds: 300),
        );
}

/// 自定义路由 - 底部弹出
class BottomSheetPageRoute<T> extends PageRouteBuilder<T> {
  final Widget page;

  BottomSheetPageRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return PageTransitions.slideFromBottom(child, animation);
          },
          transitionDuration: const Duration(milliseconds: 250),
        );
}

/// 列表项进入动画
class AnimatedListItem extends StatefulWidget {
  final Widget child;
  final int index;
  final Duration duration;

  const AnimatedListItem({
    super.key,
    required this.child,
    required this.index,
    this.duration = const Duration(milliseconds: 300),
  });

  @override
  State<AnimatedListItem> createState() => _AnimatedListItemState();
}

class _AnimatedListItemState extends State<AnimatedListItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );

    // 延迟动画，产生级联效果
    Future.delayed(Duration(milliseconds: widget.index * 50), () {
      if (mounted) {
        _controller.forward();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tween = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).chain(CurveTween(curve: Curves.easeOutCubic));

    return FadeTransition(
      opacity: _animation,
      child: SlideTransition(
        position: _animation.drive(tween),
        child: widget.child,
      ),
    );
  }
}

/// 脉冲缩放动画（用于按钮点击反馈）
class PulseScale extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const PulseScale({
    super.key,
    required this.child,
    this.onTap,
  });

  @override
  State<PulseScale> createState() => _PulseScaleState();
}

class _PulseScaleState extends State<PulseScale>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );

    _animation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    _controller.reverse();
    widget.onTap?.call();
  }

  void _onTapCancel() {
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: ScaleTransition(
        scale: _animation,
        child: widget.child,
      ),
    );
  }
}
