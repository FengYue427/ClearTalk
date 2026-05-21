import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'proxy_ai_service.dart';

class QuotaStatus {
  final String tier;
  final int limit;
  final int used;
  final int remaining;

  QuotaStatus({
    required this.tier,
    required this.limit,
    required this.used,
    required this.remaining,
  });

  factory QuotaStatus.fromJson(Map<String, dynamic> json) {
    return QuotaStatus(
      tier: json['tier']?.toString() ?? 'free',
      limit: (json['limit'] as num?)?.toInt() ?? 20,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
    );
  }
}

class QuotaService {
  final Dio _dio;

  QuotaService({Dio? dio}) : _dio = dio ?? Dio();

  Future<QuotaStatus> fetch() async {
    final prefs = await SharedPreferences.getInstance();
    final base = prefs.getString('cleartalk_api_base_url')?.trim() ??
        ProxyAiService.defaultBaseUrl;
    try {
      final res = await _dio.get('$base/api/quota');
      return QuotaStatus.fromJson(Map<String, dynamic>.from(res.data));
    } catch (_) {
      return QuotaStatus(tier: 'free', limit: 50, used: 0, remaining: 50);
    }
  }
}
