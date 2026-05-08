import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'models/history_record.dart';
import 'l10n/app_i18n.dart';
import 'pages/home_page.dart';
import 'providers/app_provider.dart';
import 'services/storage_service.dart';
import 'services/user_service.dart';
import 'services/sync_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 初始化 Hive
  await Hive.initFlutter();
  Hive.registerAdapter(HistoryRecordAdapter());
  await Hive.openBox<HistoryRecord>('history');

  // 初始化存储服务
  final storageService = StorageService();
  await storageService.init();

  // 初始化用户服务
  final userService = UserService();
  await userService.init();

  // 初始化同步服务
  final syncService = SyncService();
  await syncService.init();
  syncService.setStorageService(storageService);

  // 已登录用户自动同步
  if (userService.isLoggedIn) {
    await syncService.autoSync();
  }

  runApp(
    ProviderScope(
      overrides: [
        storageServiceProvider.overrideWithValue(storageService),
      ],
      child: const ClearTalkApp(),
    ),
  );
}

class ClearTalkApp extends ConsumerWidget {
  const ClearTalkApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp(
      onGenerateTitle: (context) => AppI18n.of(context).tr('app.title'),
      debugShowCheckedModeBanner: false,
      supportedLocales: AppI18n.supportedLocales,
      localizationsDelegates: const [
        AppI18n.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5B8DEF),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'NotoSansSC',
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF5B8DEF),
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
        fontFamily: 'NotoSansSC',
      ),
      home: const HomePage(),
    );
  }
}
