import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { AttachmentPicker } from '@/components/attachment-picker';
import { EmptyText } from '@/components/blocks';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useCurrency } from '@/features/profile/api';
import {
  EXPENSE_CATEGORIES,
  recordErrorMessage,
  useCreateExpense,
  useCreateFuelEntry,
  useCreateMaintenance,
  usePartCategories,
  type ExpenseCategory,
  type RecordKind,
} from '@/features/records/api';
import { AttachmentUploadError, type PendingAttachment } from '@/features/records/attachments';
import { FUEL_TYPES, type FuelType } from '@/features/vehicles/api';
import { lookupName } from '@/features/vehicles/lookups';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { currencyLabel, formatNumber } from '@/lib/format';
import { parseNumber } from '@/lib/numbers';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

const KINDS: RecordKind[] = ['maintenance', 'fuel', 'expense'];

function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === 'string' && (KINDS as string[]).includes(value);
}

export default function AddRecordScreen() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const params = useLocalSearchParams<{ type?: string }>();
  const { activeVehicle } = useActiveVehicle();
  const currency = useCurrency();
  const parts = usePartCategories();

  const [kind, setKind] = useState<RecordKind>(isRecordKind(params.type) ? params.type : 'maintenance');
  const [partId, setPartId] = useState<string | null>(null);
  const [fuelType, setFuelType] = useState<FuelType | null>(null);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | null>(null);
  const [date, setDate] = useState(todayISO);
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [place, setPlace] = useState('');
  const [liters, setLiters] = useState('');
  const [fullTank, setFullTank] = useState(true);
  const [nextDue, setNextDue] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Quick-add buttons on Home open this tab with ?type=fuel|maintenance.
  const [seenType, setSeenType] = useState(params.type);
  if (params.type !== seenType) {
    setSeenType(params.type);
    if (isRecordKind(params.type)) {
      setKind(params.type);
      setError(null);
      setNotice(null);
    }
  }

  const createFuel = useCreateFuelEntry();
  const createMaintenance = useCreateMaintenance();
  const createExpense = useCreateExpense();
  const saving = createFuel.isPending || createMaintenance.isPending || createExpense.isPending;

  if (!activeVehicle) {
    return (
      <AppScreen>
        <ThemedText style={styles.formTitle}>{t('records.title')}</ThemedText>
        <EmptyText>{t('records.needVehicle')}</EmptyText>
        <Button title={t('vehicles.add')} onPress={() => router.push('/vehicles/new')} />
      </AppScreen>
    );
  }

  const vehicle = activeVehicle;
  const currentKm = vehicle.current_odometer;
  const selectedFuelType = fuelType ?? vehicle.fuel_type;

  const kindOptions = KINDS.map((value) => ({ value, label: t(`records.${value}`) }));
  const partOptions: SelectOption<string>[] = (parts.data ?? []).map((p) => ({
    value: p.id,
    label: lookupName(p, lang),
    keywords: `${p.name_en} ${p.name_ar ?? ''}`,
  }));
  const fuelOptions: SelectOption<FuelType>[] = FUEL_TYPES.map((value) => ({
    value,
    label: t(`fuelTypes.${value}`),
  }));
  const expenseOptions: SelectOption<ExpenseCategory>[] = EXPENSE_CATEGORIES.map((value) => ({
    value,
    label: t(`expenseCategories.${value}`),
  }));

  function changeKind(next: RecordKind) {
    setKind(next);
    setError(null);
    setNotice(null);
  }

  function resetForm() {
    setPartId(null);
    setExpenseCategory(null);
    setDate(todayISO());
    setOdometer('');
    setCost('');
    setPlace('');
    setLiters('');
    setFullTank(true);
    setNextDue('');
    setNotes('');
    setAttachments([]);
  }

  function submit() {
    setNotice(null);
    const km = parseNumber(odometer);
    const amount = parseNumber(cost);
    const litersValue = parseNumber(liters);
    const nextDueKm = parseNumber(nextDue);
    const kmRequired = kind !== 'expense';

    if (kind === 'maintenance' && !partId) return setError(t('records.missingPart'));
    if (kind === 'expense' && !expenseCategory) return setError(t('records.missingExpense'));
    if ((kmRequired && km === null) || (km !== null && !Number.isInteger(km))) {
      return setError(t('records.invalidOdometer'));
    }
    if (amount === null || Number.isNaN(amount)) return setError(t('records.invalidCost'));
    if (kind === 'fuel' && (litersValue === null || Number.isNaN(litersValue) || litersValue <= 0)) {
      return setError(t('records.invalidLiters'));
    }
    if (nextDueKm !== null && !Number.isInteger(nextDueKm)) {
      return setError(t('records.invalidOdometer'));
    }
    setError(null);

    const trimmedPlace = place.trim() || null;
    const trimmedNotes = notes.trim() || null;
    const callbacks = {
      onSuccess: () => {
        resetForm();
        setNotice(t('records.saved'));
      },
      onError: (e: Error) => {
        // The record itself was saved; clear the form so it isn't submitted twice.
        if (e instanceof AttachmentUploadError) resetForm();
        setError(recordErrorMessage(e, t));
      },
    };

    if (kind === 'fuel') {
      createFuel.mutate(
        {
          vehicle_id: vehicle.id,
          filled_at: date,
          odometer: km!,
          liters: litersValue!,
          total_cost: amount,
          fuel_type: selectedFuelType,
          station: trimmedPlace,
          is_full_tank: fullTank,
          notes: trimmedNotes,
          attachments,
        },
        callbacks
      );
    } else if (kind === 'maintenance') {
      createMaintenance.mutate(
        {
          vehicle_id: vehicle.id,
          performed_at: date,
          odometer: km!,
          workshop: trimmedPlace,
          notes: trimmedNotes,
          category_id: partId!,
          cost: amount,
          next_due_km: nextDueKm,
          attachments,
        },
        callbacks
      );
    } else {
      createExpense.mutate(
        {
          vehicle_id: vehicle.id,
          category: expenseCategory!,
          spent_at: date,
          amount,
          odometer: km,
          notes: trimmedNotes,
        },
        callbacks
      );
    }
  }

  return (
    <AppScreen>
      <ThemedText style={styles.formTitle}>{t('records.title')}</ThemedText>
      <View style={styles.categories}>
        <ChipSelect options={kindOptions} value={kind} onChange={changeKind} fill />
      </View>

      <View style={styles.fields}>
        {kind === 'maintenance' && (
          <SelectField
            label={t('records.servicePart')}
            placeholder={t('records.selectPart')}
            options={partOptions}
            value={partId}
            onChange={setPartId}
            loading={parts.isPending}
            searchable
          />
        )}
        {kind === 'fuel' && (
          <SelectField
            label={t('records.fuelType')}
            placeholder={t('records.fuelType')}
            options={fuelOptions}
            value={selectedFuelType}
            onChange={setFuelType}
          />
        )}
        {kind === 'expense' && (
          <SelectField
            label={t('records.expenseType')}
            placeholder={t('records.selectExpense')}
            options={expenseOptions}
            value={expenseCategory}
            onChange={setExpenseCategory}
          />
        )}

        <View style={styles.row}>
          <View style={styles.cell}>
            <DateField label={t('records.date')} value={date} onChange={setDate} maximumDate={new Date()} />
          </View>
          <View style={styles.cell}>
            <TextField
              label={t('records.odometer')}
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="number-pad"
              placeholder={formatNumber(currentKm, lang)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.cell}>
            <TextField
              label={t('records.cost', { currency: currencyLabel(currency, lang) })}
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.cell}>
            {kind === 'fuel' ? (
              <TextField
                label={t('records.liters')}
                value={liters}
                onChangeText={setLiters}
                keyboardType="decimal-pad"
                placeholder="45"
              />
            ) : kind === 'maintenance' ? (
              <TextField
                label={t('records.workshop')}
                value={place}
                onChangeText={setPlace}
                placeholder={t('records.optional')}
              />
            ) : null}
          </View>
        </View>

        {kind === 'fuel' && (
          <>
            <TextField
              label={t('records.station')}
              value={place}
              onChangeText={setPlace}
              placeholder={t('records.optional')}
            />
            <View style={styles.switchRow}>
              <ThemedText style={styles.switchLabel}>{t('records.fullTank')}</ThemedText>
              <Switch
                value={fullTank}
                onValueChange={setFullTank}
                trackColor={{ true: theme.tint, false: theme.track }}
              />
            </View>
          </>
        )}

        {kind === 'maintenance' && (
          <TextField
            label={t('records.nextDue')}
            value={nextDue}
            onChangeText={setNextDue}
            keyboardType="number-pad"
            placeholder={t('records.nextDuePlaceholder', {
              km: formatNumber(currentKm + 5000, lang),
            })}
          />
        )}

        <TextField
          label={t('records.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('records.notesPlaceholder')}
        />

        {kind !== 'expense' && <AttachmentPicker value={attachments} onChange={setAttachments} />}
      </View>

      <Button style={styles.save} title={t('records.save')} loading={saving} onPress={submit} />
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        {error && <ThemedText style={styles.noticeText} themeColor="danger">{error}</ThemedText>}
        {notice && <ThemedText style={[styles.noticeText, { color: theme.accent }]}>{notice}</ThemedText>}
      </View>
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
  categories: {
    marginBottom: 17,
  },
  fields: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: {
    fontSize: 14,
    flex: 1,
  },
  save: {
    marginTop: 18,
  },
  notice: {
    minHeight: 18,
    marginTop: 9,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
