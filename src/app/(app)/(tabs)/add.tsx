import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { EmptyText } from '@/components/blocks';
import { isRecordKind, RecordForm } from '@/components/record-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import type { RecordKind } from '@/features/records/api';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

export default function AddRecordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string }>();
  const { activeVehicle } = useActiveVehicle();

  const [kind, setKind] = useState<RecordKind>(isRecordKind(params.type) ? params.type : 'maintenance');

  // Quick-add buttons on Home open this tab with ?type=fuel|maintenance.
  const [seenType, setSeenType] = useState(params.type);
  if (params.type !== seenType) {
    setSeenType(params.type);
    if (isRecordKind(params.type)) setKind(params.type);
  }

  return (
    <AppScreen>
      <ThemedText style={styles.formTitle}>{t('records.title')}</ThemedText>
      {activeVehicle ? (
        // Keyed by vehicle so switching cars starts a fresh form.
        <RecordForm key={activeVehicle.id} vehicle={activeVehicle} kind={kind} onKindChange={setKind} />
      ) : (
        <>
          <EmptyText>{t('records.needVehicle')}</EmptyText>
          <Button title={t('vehicles.add')} onPress={() => router.push('/vehicles/new')} />
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  formTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 500,
    marginBottom: 16,
  },
});
