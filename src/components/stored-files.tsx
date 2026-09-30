import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { FieldLabel } from '@/components/ui/field-label';
import type { StoredAttachment } from '@/features/records/attachments';
import { useTheme } from '@/hooks/use-theme';

type StoredFilesProps = {
  label: string;
  files: StoredAttachment[];
  /** Omit to show the files read-only. */
  onRemove?: (file: StoredAttachment) => void;
};

/** Thumbnails of uploaded files; tap opens the file, × marks it for removal. */
export function StoredFiles({ label, files, onRemove }: StoredFilesProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (files.length === 0) return null;

  return (
    <View>
      <FieldLabel>{label}</FieldLabel>
      <View style={styles.thumbs}>
        {files.map((file) => (
          <View key={file.id}>
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={t('documents.openFile')}
              onPress={() => file.url && Linking.openURL(file.url)}
              style={[styles.thumb, { backgroundColor: theme.iconBackground, borderColor: theme.border }]}>
              {file.mime_type?.startsWith('image/') && file.url ? (
                <Image source={{ uri: file.url }} style={styles.image} contentFit="cover" />
              ) : (
                <MaterialCommunityIcons name="file-pdf-box" size={36} color={theme.icon} />
              )}
            </Pressable>
            {onRemove && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('documents.removeFile')}
                hitSlop={8}
                onPress={() => onRemove(file)}
                style={[styles.remove, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <MaterialCommunityIcons name="close" size={14} color={theme.text} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  image: {
    width: '100%',
    height: '100%',
  },
  remove: {
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
