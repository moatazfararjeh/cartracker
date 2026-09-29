import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { differenceInCalendarDays } from 'date-fns';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconName } from '@/components/blocks';
import { ThemedText } from '@/components/themed-text';
import {
  DOCUMENT_TYPES,
  documentStatus,
  useVehicleDocuments,
  type DocumentType,
  type VehicleDocument,
} from '@/features/documents/api';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, parseISODate } from '@/lib/dates';

const ICONS: Record<DocumentType, IconName> = {
  insurance: 'shield-car',
  registration: 'card-account-details-outline',
};

/** Insurance card + vehicle license tiles with their expiry status. */
export function DocumentCards({ vehicleId }: { vehicleId: string }) {
  const { data } = useVehicleDocuments(vehicleId);

  return (
    <View style={styles.row}>
      {DOCUMENT_TYPES.map((type) => (
        <DocumentCard key={type} type={type} doc={data?.[type]} />
      ))}
    </View>
  );
}

function DocumentCard({ type, doc }: { type: DocumentType; doc: VehicleDocument | undefined }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const status = documentStatus(doc);

  let statusText: string;
  let statusColor: string = theme.textSecondary;
  if (status === 'missing' || !doc?.expiry_date) {
    statusText = t('documents.notAdded');
  } else if (status === 'expired') {
    statusText = t('documents.expired', { date: formatDate(doc.expiry_date, i18n.language, true) });
    statusColor = theme.danger;
  } else if (status === 'expiring') {
    const days = differenceInCalendarDays(parseISODate(doc.expiry_date), new Date());
    statusText = t('documents.expiresIn', { count: days });
    statusColor = theme.warningText;
  } else {
    statusText = t('documents.validUntil', { date: formatDate(doc.expiry_date, i18n.language, true) });
    statusColor = theme.accent;
  }

  const highlight = status === 'expired' || status === 'expiring';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`documents.${type}.short`)}, ${statusText}`}
      onPress={() => router.push({ pathname: '/documents/[type]', params: { type } })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: highlight ? theme.warningBackground : theme.backgroundElement,
          borderColor: theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.iconBackground }]}>
        <MaterialCommunityIcons name={ICONS[type]} size={18} color={theme.icon} />
      </View>
      <ThemedText numberOfLines={1} style={styles.title}>
        {t(`documents.${type}.short`)}
      </ThemedText>
      <ThemedText numberOfLines={2} style={[styles.status, { color: statusColor }]}>
        {status === 'missing' ? `+ ${t('documents.add')}` : statusText}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: 500,
  },
  status: {
    fontSize: 12,
    lineHeight: 16,
  },
});
