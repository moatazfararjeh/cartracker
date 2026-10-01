import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { isRecordKind, RecordForm } from '@/components/record-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ScreenMaxWidth } from '@/constants/theme';
import { recordErrorMessage, useDeleteRecord, useRecord } from '@/features/records/api';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';
import { useConfirm } from '@/providers/confirm-provider';

export default function EditRecordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kind: string; id: string }>();
  const kind = isRecordKind(params.kind) ? params.kind : null;
  const record = useRecord(kind ?? 'fuel', kind ? params.id : undefined);
  const { vehicles } = useActiveVehicle();
  const remove = useDeleteRecord();
  const confirm = useConfirm();

  const vehicle = vehicles.find((v) => v.id === record.data?.vehicle_id);
  const title = kind ? t(`records.edit.${kind}`) : '';

  async function deleteRecord() {
    if (!kind || !record.data) return;
    const ok = await confirm({
      title: t('records.deleteTitle'),
      message: t('records.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(
      { kind, id: record.data.id, vehicleId: record.data.vehicle_id },
      { onSuccess: () => router.back() }
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      {!kind ? null : record.isPending ? (
        <ActivityIndicator style={styles.message} />
      ) : record.isError || !record.data || !vehicle ? (
        <ThemedText style={styles.message} themeColor="danger">
          {t('records.notFound')}
        </ThemedText>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic">
            <RecordForm
              key={record.data.id}
              vehicle={vehicle}
              kind={kind}
              record={record.data}
              onSaved={() => router.back()}
            />
            <Button
              variant="danger"
              title={t('records.delete')}
              loading={remove.isPending}
              onPress={deleteRecord}
            />
            {remove.error && (
              <ThemedText themeColor="danger">{recordErrorMessage(remove.error, t)}</ThemedText>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: ScreenMaxWidth,
    alignSelf: 'center',
    padding: 20,
    gap: 8,
  },
});
