import 'dart:io';

import 'package:cleartalk/main.dart';
import 'package:cleartalk/models/history_record.dart';
import 'package:cleartalk/providers/app_provider.dart';
import 'package:cleartalk/services/storage_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  late StorageService storageService;

  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    SharedPreferences.setMockInitialValues({});

    final dir = await Directory.systemTemp.createTemp('cleartalk_widget_test');
    Hive.init(dir.path);
    Hive.registerAdapter(HistoryRecordAdapter());
    await Hive.openBox<HistoryRecord>('history');

    storageService = StorageService();
    await storageService.init();
  });

  tearDownAll(() async {
    await Hive.close();
  });

  testWidgets('ClearTalkApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          storageServiceProvider.overrideWithValue(storageService),
        ],
        child: const ClearTalkApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
