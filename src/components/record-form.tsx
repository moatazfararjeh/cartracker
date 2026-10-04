import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { AttachmentPicker } from '@/components/attachment-picker';
import { StoredFiles } from '@/components/stored-files';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { DateField } from '@/components/ui/date-field';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useCurrency } from '@/features/profile/api';
import {
  DEFAULT_FUEL_PRICES,
  EXPENSE_CATEGORIES,
  recordErrorMessage,
  useLastFuelPrices,
  usePartCategories,
  useRecordAttachments,
  useSaveRecord,
  type ExpenseCategory,
  type LoadedRecord,
  type RecordKind,
} from '@/features/records/api';
import {
  AttachmentUploadError,
  type PendingAttachment,
  type StoredAttachment,
} from '@/features/records/attachments';
import { FUEL_TYPES, type FuelType, type Vehicle } from '@/features/vehicles/api';
import { lookupName } from '@/features/vehicles/lookups';
import { useTheme } from '@/hooks/use-theme';
import { todayISO } from '@/lib/dates';
import { currencyLabel, formatMoney, formatNumber } from '@/lib/format';
import { parseNumber } from '@/lib/numbers';

export const RECORD_KINDS: RecordKind[] = ['maintenance', 'fuel', 'expense'];

export function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === 'string' && (RECORD_KINDS as string[]).includes(value);
}

/** Number shown in an input: empty for null, no thousands separators. */
function toInput(value: number | null | undefined) {
  return value == null ? '' : String(value);
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Liters bought = total cost ÷ price per liter, rounded to the column's 2 decimals. */
function litersFor(cost: number | null, price: number | null) {
  if (cost == null || price == null || Number.isNaN(cost) || Number.isNaN(price) || price <= 0) {
    return null;
  }
  return round(cost / price, 2);
}

type RecordFormProps = {
  vehicle: Vehicle;
  kind: RecordKind;
  /** Shows the Maintenance / Fuel / Expense switch (new records only). */
  onKindChange?: (kind: RecordKind) => void;
  /** Existing record to edit; omit to create. */
  record?: LoadedRecord;
  /** Called after a successful save of an existing record. */
  onSaved?: () => void;
};

export function RecordForm({ vehicle, kind, onKindChange, record, onSaved }: RecordFormProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const theme = useTheme();
  const currency = useCurrency();
  const parts = usePartCategories();
  const save = useSaveRecord();
  const storedFiles = useRecordAttachments(kind, record?.id);
  const isEdit = !!record;

  const [partId, setPartId] = useState<string | null>(record?.category_id ?? null);
  const [fuelType, setFuelType] = useState<FuelType | null>(record?.fuel_type ?? null);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory | null>(
    record?.expense_category ?? null
  );
  const [date, setDate] = useState(record?.date ?? todayISO());
  const [odometer, setOdometer] = useState(toInput(record?.odometer));
  // For maintenance this is the spare parts cost; labor is entered separately.
  const [cost, setCost] = useState(toInput(record?.amount));
  const [labor, setLabor] = useState(record?.labor_cost ? toInput(record.labor_cost) : '');
  const [place, setPlace] = useState(record?.place ?? '');
  // Price per liter: typed by the user, or suggested until they change it.
  const [price, setPrice] = useState(
    record?.liters ? toInput(round(record.amount / record.liters, 3)) : ''
  );
  const [priceTouched, setPriceTouched] = useState(!!record);
  const [fullTank, setFullTank] = useState(record?.is_full_tank ?? true);
  const [nextDue, setNextDue] = useState(toInput(record?.next_due_km));
  const [notes, setNotes] = useState(record?.notes ?? '');
  const [newFiles, setNewFiles] = useState<PendingAttachment[]>([]);
  const [removedFiles, setRemovedFiles] = useState<StoredAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentKm = vehicle.current_odometer;
  const selectedFuelType = fuelType ?? vehicle.fuel_type;
  const lastPrices = useLastFuelPrices(kind === 'fuel' ? vehicle.id : undefined);
  const suggestedPrice =
    lastPrices.data?.[selectedFuelType] ?? DEFAULT_FUEL_PRICES[selectedFuelType] ?? null;
  const priceInput = priceTouched ? price : toInput(suggestedPrice);
  const computedLiters = litersFor(parseNumber(cost), parseNumber(priceInput));
  const maintenanceTotal =
    (parseNumber(cost) || 0) + (parseNumber(labor) || 0) + (record?.extra_items_cost ?? 0);
  const keptFiles = (storedFiles.data ?? []).filter((f) => !removedFiles.some((r) => r.id === f.id));

  const kindOptions = RECORD_KINDS.map((value) => ({ value, label: t(`records.${value}`) }));
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
    onKindChange?.(next);
    setError(null);
    setNotice(null);
  }

  function resetForm() {
    setPartId(null);
    setExpenseCategory(null);
    setDate(todayISO());
    setOdometer('');
    setCost('');
    setLabor('');
    setPlace('');
    setPrice('');
    setPriceTouched(false);
    setFullTank(true);
    setNextDue('');
    setNotes('');
    setNewFiles([]);
    setRemovedFiles([]);
  }

  function submit() {
    setNotice(null);
    const km = parseNumber(odometer);
    const amount = parseNumber(cost);
    const laborValue = kind === 'maintenance' ? parseNumber(labor) : null;
    const priceValue = parseNumber(priceInput);
    const litersValue = litersFor(amount, priceValue);
    const nextDueKm = parseNumber(nextDue);
    const kmRequired = kind !== 'expense';

    if (kind === 'maintenance' && !partId) return setError(t('records.missingPart'));
    if (kind === 'expense' && !expenseCategory) return setError(t('records.missingExpense'));
    if ((kmRequired && km === null) || (km !== null && !Number.isInteger(km))) {
      return setError(t('records.invalidOdometer'));
    }
    if (amount === null || Number.isNaN(amount)) return setError(t('records.invalidCost'));
    if (laborValue !== null && Number.isNaN(laborValue)) return setError(t('records.invalidLabor'));
    if (kind === 'fuel' && (priceValue === null || Number.isNaN(priceValue) || priceValue <= 0)) {
      return setError(t('records.invalidPrice'));
    }
    if (kind === 'fuel' && (litersValue === null || litersValue <= 0)) {
      return setError(t('records.invalidLiters'));
    }
    if (nextDueKm !== null && !Number.isInteger(nextDueKm)) {
      return setError(t('records.invalidOdometer'));
    }
    setError(null);

    save.mutate(
      {
        id: record?.id,
        item_id: record?.item_id,
        values: {
          kind,
          vehicle_id: vehicle.id,
          date,
          odometer: km,
          amount,
          labor_cost: laborValue,
          place: kind === 'expense' ? null : place.trim() || null,
          notes: notes.trim() || null,
          category_id: kind === 'maintenance' ? partId : null,
          next_due_km: kind === 'maintenance' ? nextDueKm : null,
          liters: kind === 'fuel' ? litersValue : null,
          fuel_type: kind === 'fuel' ? selectedFuelType : null,
          is_full_tank: fullTank,
          expense_category: kind === 'expense' ? expenseCategory : null,
        },
        newFiles,
        removedFiles,
      },
      {
        onSuccess: () => {
          if (isEdit) {
            onSaved?.();
          } else {
            resetForm();
            setNotice(t('records.saved'));
          }
        },
        onError: (e) => {
          if (e instanceof AttachmentUploadError) {
            // The record itself was saved; don't let it be submitted twice.
            if (isEdit) {
              setNewFiles([]);
              setRemovedFiles([]);
            } else {
              resetForm();
            }
          }
          setError(recordErrorMessage(e, t));
        },
      }
    );
  }

  return (
    <View>
      {onKindChange && !isEdit && (
        <View style={styles.categories}>
          <ChipSelect options={kindOptions} value={kind} onChange={changeKind} fill />
        </View>
      )}

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
              label={
                kind === 'maintenance'
                  ? t('records.partsCost', { currency: currencyLabel(currency, lang) })
                  : t('records.cost', { currency: currencyLabel(currency, lang) })
              }
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.cell}>
            {kind === 'fuel' ? (
              <TextField
                label={t('records.pricePerLiter', { currency: currencyLabel(currency, lang) })}
                value={priceInput}
                onChangeText={(value) => {
                  setPriceTouched(true);
                  setPrice(value);
                }}
                keyboardType="decimal-pad"
                placeholder="2.18"
              />
            ) : kind === 'maintenance' ? (
              <TextField
                label={t('records.laborCost', { currency: currencyLabel(currency, lang) })}
                value={labor}
                onChangeText={setLabor}
                keyboardType="decimal-pad"
                placeholder={t('records.optional')}
              />
            ) : null}
          </View>
        </View>

        {kind === 'maintenance' && (
          <>
            <View style={[styles.totalRow, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={styles.totalLabel}>{t('records.total')}</ThemedText>
              <ThemedText style={[styles.totalValue, { color: theme.accent }]}>
                {formatMoney(maintenanceTotal, currency, lang)}
              </ThemedText>
            </View>
            <TextField
              label={t('records.workshop')}
              value={place}
              onChangeText={setPlace}
              placeholder={t('records.optional')}
            />
          </>
        )}

        {kind === 'fuel' && (
          <>
            <View style={styles.row}>
              <View style={styles.cell}>
                <TextField
                  label={t('records.litersCalculated')}
                  value={computedLiters != null ? formatNumber(computedLiters, lang, 2) : ''}
                  placeholder="—"
                  editable={false}
                  accessibilityHint={t('records.litersHint')}
                  style={{ backgroundColor: theme.backgroundSelected, color: theme.accent }}
                />
              </View>
              <View style={styles.cell}>
                <TextField
                  label={t('records.station')}
                  value={place}
                  onChangeText={setPlace}
                  placeholder={t('records.optional')}
                />
              </View>
            </View>
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

        <StoredFiles
          label={t('records.savedFiles')}
          files={keptFiles}
          onRemove={(file) => setRemovedFiles((r) => [...r, file])}
        />
        <AttachmentPicker value={newFiles} onChange={setNewFiles} existingCount={keptFiles.length} />
      </View>

      <Button
        style={styles.save}
        title={isEdit ? t('records.saveChanges') : t('records.save')}
        loading={save.isPending}
        onPress={submit}
      />
      <View accessibilityLiveRegion="polite" style={styles.notice}>
        {error && (
          <ThemedText style={styles.noticeText} themeColor="danger">
            {error}
          </ThemedText>
        )}
        {notice && <ThemedText style={[styles.noticeText, { color: theme.accent }]}>{notice}</ThemedText>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 40,
    borderRadius: 10,
  },
  totalLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  totalValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 600,
    fontVariant: ['tabular-nums'],
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
