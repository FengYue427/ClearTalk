// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'history_record.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class HistoryRecordAdapter extends TypeAdapter<HistoryRecord> {
  @override
  final int typeId = 0;

  @override
  HistoryRecord read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return HistoryRecord(
      id: fields[0] as String,
      sceneId: fields[1] as String,
      sceneName: fields[2] as String,
      inputValues: (fields[3] as Map).cast<String, dynamic>(),
      generatedText: fields[4] as String,
      tone: fields[5] as String,
      createdAt: fields[6] as DateTime,
      category: fields[7] as String?,
    );
  }

  @override
  void write(BinaryWriter writer, HistoryRecord obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.sceneId)
      ..writeByte(2)
      ..write(obj.sceneName)
      ..writeByte(3)
      ..write(obj.inputValues)
      ..writeByte(4)
      ..write(obj.generatedText)
      ..writeByte(5)
      ..write(obj.tone)
      ..writeByte(6)
      ..write(obj.createdAt)
      ..writeByte(7)
      ..write(obj.category);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is HistoryRecordAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
