import 'package:flutter/material.dart';

/// 骨架屏加载组件
/// 提供流畅的 shimmer 加载效果
class SkeletonLoader extends StatefulWidget {
  final Widget child;
  final bool isLoading;
  final Color? baseColor;
  final Color? highlightColor;

  const SkeletonLoader({
    super.key,
    required this.child,
    this.isLoading = true,
    this.baseColor,
    this.highlightColor,
  });

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _animation = Tween<double>(begin: -1, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isLoading) {
      return widget.child;
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = widget.baseColor ?? (isDark ? Colors.grey[800]! : Colors.grey[200]!);
    final highlightColor = widget.highlightColor ?? (isDark ? Colors.grey[700]! : Colors.grey[100]!);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return ShaderMask(
          shaderCallback: (bounds) {
            return LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [baseColor, highlightColor, baseColor],
              stops: const [0.0, 0.5, 1.0],
              transform: _SlidingGradientTransform(_animation.value),
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcATop,
          child: widget.child,
        );
      },
    );
  }
}

class _SlidingGradientTransform extends GradientTransform {
  final double percent;

  const _SlidingGradientTransform(this.percent);

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * percent, 0, 0);
  }
}

/// 骨架屏卡片
class SkeletonCard extends StatelessWidget {
  final double height;
  final double? width;
  final double borderRadius;

  const SkeletonCard({
    super.key,
    this.height = 100,
    this.width,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width ?? double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// 骨架屏文本行
class SkeletonLine extends StatelessWidget {
  final double height;
  final double? width;
  final double borderRadius;

  const SkeletonLine({
    super.key,
    this.height = 16,
    this.width,
    this.borderRadius = 4,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width ?? double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    );
  }
}

/// 骨架屏圆形
class SkeletonCircle extends StatelessWidget {
  final double size;

  const SkeletonCircle({
    super.key,
    this.size = 48,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: size,
      width: size,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
      ),
    );
  }
}

/// 场景卡片骨架屏
class SceneCardSkeleton extends StatelessWidget {
  const SceneCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Container(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const SkeletonCircle(size: 48),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(height: 16, width: 120),
                  const SizedBox(height: 8),
                  SkeletonLine(height: 12, width: 200),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 文本生成骨架屏
class TextGenerationSkeleton extends StatelessWidget {
  const TextGenerationSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SkeletonLine(height: 16, width: 200),
            const SizedBox(height: 12),
            SkeletonLine(height: 14),
            const SizedBox(height: 8),
            SkeletonLine(height: 14),
            const SizedBox(height: 8),
            SkeletonLine(height: 14, width: 250),
            const SizedBox(height: 12),
            SkeletonLine(height: 14),
            const SizedBox(height: 8),
            SkeletonLine(height: 14, width: 180),
          ],
        ),
      ),
    );
  }
}

/// 对话消息骨架屏
class ChatMessageSkeleton extends StatelessWidget {
  final bool isUser;

  const ChatMessageSkeleton({super.key, this.isUser = false});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        child: Row(
          mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            if (!isUser)
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: SkeletonCircle(size: 32),
              ),
            Container(
              padding: const EdgeInsets.all(12),
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.7,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SkeletonLine(height: 14, width: isUser ? 150 : 200),
                  const SizedBox(height: 6),
                  SkeletonLine(height: 14, width: isUser ? 100 : 180),
                ],
              ),
            ),
            if (isUser)
              const Padding(
                padding: EdgeInsets.only(left: 8),
                child: SkeletonCircle(size: 32),
              ),
          ],
        ),
      ),
    );
  }
}

/// 历史记录卡片骨架屏
class HistoryRecordSkeleton extends StatelessWidget {
  const HistoryRecordSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return SkeletonLoader(
      child: Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.only(bottom: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 顶部标签行
            Row(
              children: [
                SkeletonLine(height: 20, width: 60, borderRadius: 4),
                const SizedBox(width: 8),
                SkeletonLine(height: 20, width: 40, borderRadius: 4),
                const Spacer(),
                SkeletonLine(height: 12, width: 40),
              ],
            ),
            const SizedBox(height: 12),
            // 场景名称
            SkeletonLine(height: 16, width: 150),
            const SizedBox(height: 8),
            // 内容文本
            SkeletonLine(height: 14),
            const SizedBox(height: 6),
            SkeletonLine(height: 14, width: 250),
            const SizedBox(height: 6),
            SkeletonLine(height: 14, width: 180),
            const SizedBox(height: 12),
            // 底部操作按钮
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                SkeletonLine(height: 16, width: 40),
                const SizedBox(width: 16),
                SkeletonLine(height: 16, width: 40),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 历史记录列表骨架屏（多个卡片）
class HistoryListSkeleton extends StatelessWidget {
  final int count;

  const HistoryListSkeleton({super.key, this.count = 3});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: count,
      itemBuilder: (context, index) => const HistoryRecordSkeleton(),
    );
  }
}
