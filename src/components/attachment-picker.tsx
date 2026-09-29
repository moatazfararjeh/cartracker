import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FieldLabel } from '@/components/ui/field-label';
import {
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  type PendingAttachment,
} from '@/features/records/attachments';
import { useTheme } from '@/hooks/use-theme';
import { formatNumber } from '@/lib/format';

type AttachmentPickerProps = {
  value: PendingAttachment[];
  onChange: (files: PendingAttachment[]) => void;
  label?: string;
  /** Files already stored for this record; they count toward the limit. */
  existingCount?: number;
};

let keyCounter = 0;
const nextKey = () => `att-${Date.now()}-${keyCounter++}`;

function formatSize(bytes: number | null, language: string) {
  if (bytes == null) return '';
  if (bytes < 1024 * 1024) return `${formatNumber(Math.max(1, Math.round(bytes / 1024)), language)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), language, 1)} MB`;
}

/** Optional receipts / photos / PDFs for a record; uploaded after the record saves. */
export function AttachmentPicker({ value, onChange, label, existingCount = 0 }: AttachmentPickerProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);

  function add(files: PendingAttachment[]) {
    const tooBig = files.filter((f) => f.size != null && f.size > MAX_ATTACHMENT_BYTES);
    const accepted = files.filter((f) => !tooBig.includes(f));
    const room = MAX_ATTACHMENTS - existingCount - value.length;

    if (tooBig.length > 0) {
      setError(t('attachments.tooLarge', { max: MAX_ATTACHMENT_BYTES / (1024 * 1024) }));
    } else if (accepted.length > room) {
      setError(t('attachments.tooMany', { max: MAX_ATTACHMENTS }));
    } else {
      setError(null);
    }
    if (room > 0 && accepted.length > 0) {
      onChange([...value, ...accepted.slice(0, room)]);
    }
  }

  function fromImageAssets(assets: ImagePicker.ImagePickerAsset[]): PendingAttachment[] {
    return assets.map((a, i) => ({
      key: nextKey(),
      uri: a.uri,
      name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`,
      mimeType: a.mimeType ?? 'image/jpeg',
      size: a.fileSize ?? null,
    }));
  }

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_ATTACHMENTS - existingCount - value.length),
      quality: 0.7,
    });
    if (!result.canceled) add(fromImageAssets(result.assets));
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(t('attachments.cameraDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled) add(fromImageAssets(result.assets));
  }

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
      base64: false,
    });
    if (result.canceled) return;
    add(
      result.assets.map((a) => ({
        key: nextKey(),
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType ?? 'application/octet-stream',
        size: a.size ?? null,
      }))
    );
  }

  const full = existingCount + value.length >= MAX_ATTACHMENTS;
  const actions: { key: string; label: string; icon: 'image-outline' | 'camera-outline' | 'paperclip'; onPress: () => void }[] = [
    { key: 'photo', label: t('attachments.photo'), icon: 'image-outline', onPress: pickPhotos },
    ...(Platform.OS !== 'web'
      ? [{ key: 'camera', label: t('attachments.camera'), icon: 'camera-outline' as const, onPress: takePhoto }]
      : []),
    { key: 'file', label: t('attachments.file'), icon: 'paperclip', onPress: pickFiles },
  ];

  return (
    <View>
      <FieldLabel>{label ?? t('attachments.label')}</FieldLabel>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            disabled={full}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.inputBorder,
                opacity: full ? 0.5 : pressed ? 0.75 : 1,
              },
            ]}>
            <MaterialCommunityIcons name={action.icon} size={18} color={theme.accent} />
            <ThemedText style={styles.actionText}>{action.label}</ThemedText>
          </Pressable>
        ))}
      </View>

      {value.map((file) => (
        <View
          key={file.key}
          style={[styles.file, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <MaterialCommunityIcons
            name={file.mimeType === 'application/pdf' ? 'file-pdf-box' : 'file-image-outline'}
            size={20}
            color={theme.icon}
          />
          <View style={styles.fileMain}>
            <ThemedText numberOfLines={1} style={styles.fileName}>
              {file.name}
            </ThemedText>
            {file.size != null && (
              <ThemedText style={styles.fileSize} themeColor="textSecondary">
                {formatSize(file.size, i18n.language)}
              </ThemedText>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('attachments.remove', { name: file.name })}
            hitSlop={10}
            onPress={() => {
              setError(null);
              onChange(value.filter((f) => f.key !== file.key));
            }}>
            <MaterialCommunityIcons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      ))}

      {error && (
        <ThemedText style={styles.error} themeColor="danger">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
  file: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  fileMain: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    lineHeight: 18,
  },
  fileSize: {
    fontSize: 11,
    lineHeight: 14,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
});
