import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { addYears } from 'date-fns';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AttachmentPicker } from '@/components/attachment-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { FieldLabel } from '@/components/ui/field-label';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { ScreenMaxWidth } from '@/constants/theme';
import {
  INSURANCE_COMPANIES,
  isDocumentType,
  useDocumentFiles,
  useSaveDocument,
  useVehicleDocuments,
  type DocumentType,
  type VehicleDocument,
} from '@/features/documents/api';
import { recordErrorMessage } from '@/features/records/api';
import {
  AttachmentUploadError,
  type PendingAttachment,
  type StoredAttachment,
} from '@/features/records/attachments';
import { useTheme } from '@/hooks/use-theme';
import { toISODate } from '@/lib/dates';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

/** Picker value meaning "company not in the list, type it". */
const OTHER = '__other__';

export default function DocumentScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type: string }>();
  const { activeVehicle } = useActiveVehicle();
  const docs = useVehicleDocuments(activeVehicle?.id);

  const type = isDocumentType(params.type) ? params.type : null;
  const title = type ? t(`documents.${type}.title`) : '';

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      {!type || !activeVehicle ? (
        <ThemedText style={styles.message} themeColor="textSecondary">
          {t('records.needVehicle')}
        </ThemedText>
      ) : docs.isPending ? (
        <ActivityIndicator style={styles.message} />
      ) : docs.isError ? (
        <ThemedText style={styles.message} themeColor="danger">
          {t('common.error')}
        </ThemedText>
      ) : (
        // Keyed so the form's initial state comes from the loaded document.
        <DocumentForm
          key={docs.data?.[type]?.id ?? 'new'}
          type={type}
          vehicleId={activeVehicle.id}
          doc={docs.data?.[type]}
        />
      )}
    </ThemedView>
  );
}

function DocumentForm({
  type,
  vehicleId,
  doc,
}: {
  type: DocumentType;
  vehicleId: string;
  doc: VehicleDocument | undefined;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const save = useSaveDocument();
  const files = useDocumentFiles(doc?.id);

  const knownProvider = INSURANCE_COMPANIES.find((c) => c.en === doc?.provider);
  const [provider, setProvider] = useState<string | null>(
    knownProvider ? knownProvider.en : doc?.provider ? OTHER : null
  );
  const [customProvider, setCustomProvider] = useState(knownProvider ? '' : (doc?.provider ?? ''));
  const [number, setNumber] = useState(doc?.number ?? '');
  const [expiry, setExpiry] = useState(doc?.expiry_date ?? toISODate(addYears(new Date(), 1)));
  const [notes, setNotes] = useState(doc?.notes ?? '');
  const [newFiles, setNewFiles] = useState<PendingAttachment[]>([]);
  const [removed, setRemoved] = useState<StoredAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isInsurance = type === 'insurance';
  const storedFiles = (files.data ?? []).filter((f) => !removed.some((r) => r.id === f.id));

  const providerOptions: SelectOption<string>[] = [
    ...INSURANCE_COMPANIES.map((c) => ({
      value: c.en,
      label: lang === 'ar' ? c.ar : c.en,
      keywords: `${c.en} ${c.ar}`,
    })),
    { value: OTHER, label: t('vehicles.other') },
  ];

  function submit() {
    const providerName = provider === OTHER ? customProvider.trim() : provider;
    setError(null);
    save.mutate(
      {
        vehicle_id: vehicleId,
        doc_type: type,
        number: number.trim() || null,
        provider: isInsurance ? providerName || null : null,
        expiry_date: expiry,
        notes: notes.trim() || null,
        newFiles,
        removedFiles: removed,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => {
          if (e instanceof AttachmentUploadError) {
            // The document itself was saved; only files failed.
            setNewFiles([]);
            setRemoved([]);
          }
          setError(recordErrorMessage(e, t));
        },
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <ThemedText style={styles.hint} themeColor="textSecondary">
          {t(`documents.${type}.hint`)}
        </ThemedText>

        {isInsurance && (
          <>
            <SelectField
              label={t('documents.insurance.provider')}
              placeholder={t('documents.insurance.selectProvider')}
              options={providerOptions}
              value={provider}
              onChange={setProvider}
              searchable
            />
            {provider === OTHER && (
              <TextField
                label={t('documents.insurance.providerName')}
                value={customProvider}
                onChangeText={setCustomProvider}
              />
            )}
          </>
        )}

        <TextField
          label={t(`documents.${type}.number`)}
          value={number}
          onChangeText={setNumber}
          autoCapitalize="characters"
        />

        <DateField label={t('documents.expiry')} value={expiry} onChange={setExpiry} />

        <TextField label={t('records.notes')} value={notes} onChangeText={setNotes} />

        {storedFiles.length > 0 && (
          <View>
            <FieldLabel>{t('documents.savedPhotos')}</FieldLabel>
            <View style={styles.thumbs}>
              {storedFiles.map((file) => (
                <View key={file.id} style={styles.thumbWrap}>
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t('documents.openFile')}
                    onPress={() => file.url && Linking.openURL(file.url)}
                    style={[styles.thumb, { backgroundColor: theme.iconBackground, borderColor: theme.border }]}>
                    {file.mime_type?.startsWith('image/') && file.url ? (
                      <Image source={{ uri: file.url }} style={styles.thumbImage} contentFit="cover" />
                    ) : (
                      <MaterialCommunityIcons name="file-pdf-box" size={36} color={theme.icon} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('documents.removeFile')}
                    hitSlop={8}
                    onPress={() => setRemoved((r) => [...r, file])}
                    style={[styles.removeBadge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <MaterialCommunityIcons name="close" size={14} color={theme.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
        {files.isPending && !!doc && <ActivityIndicator />}

        <AttachmentPicker
          label={t('documents.cardPhotos')}
          value={newFiles}
          onChange={setNewFiles}
          existingCount={storedFiles.length}
        />

        {error && <ThemedText themeColor="danger">{error}</ThemedText>}

        <Button title={t('documents.save')} loading={save.isPending} onPress={submit} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: 14,
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 136,
    height: 86,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeBadge: {
    position: 'absolute',
    top: -8,
    end: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
