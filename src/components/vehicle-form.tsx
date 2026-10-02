import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { ColorSwatch, SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import {
  FUEL_TYPES,
  useCreateVehicle,
  useUpdateVehicle,
  type FuelType,
  type Vehicle,
} from '@/features/vehicles/api';
import { useCurrency } from '@/features/profile/api';
import {
  lookupName,
  useVehicleMakes,
  useVehicleModels,
  VEHICLE_COLORS,
  vehicleYears,
  type VehicleColorCode,
} from '@/features/vehicles/lookups';
import { currencyLabel } from '@/lib/format';
import { parseNumber } from '@/lib/numbers';

/** Picker value meaning "not in the list, type it". */
const OTHER = '__other__';

const YEARS = vehicleYears();

type VehicleFormProps = {
  /** Vehicle to edit; omit to add a new one. */
  vehicle?: Vehicle;
  onSaved: (vehicle: Vehicle) => void;
};

/** Add / edit vehicle form: make, model, year and color come from lookups. */
export function VehicleForm({ vehicle, onSaved }: VehicleFormProps) {
  const { t, i18n } = useTranslation();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const saving = createVehicle.isPending || updateVehicle.isPending;

  // A vehicle saved without a lookup link was typed in under "Other".
  const [makeCode, setMakeCode] = useState<string | null>(
    vehicle ? (vehicle.make_code ?? OTHER) : null
  );
  const [customMake, setCustomMake] = useState(vehicle && !vehicle.make_code ? vehicle.make : '');
  const [modelId, setModelId] = useState<number | typeof OTHER | null>(
    vehicle ? (vehicle.model_id ?? OTHER) : null
  );
  const [customModel, setCustomModel] = useState(vehicle && !vehicle.model_id ? vehicle.model : '');
  const [year, setYear] = useState<number | null>(vehicle?.year ?? null);
  const [color, setColor] = useState<VehicleColorCode | null>(
    (vehicle?.color as VehicleColorCode | null) ?? null
  );
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [fuelType, setFuelType] = useState<FuelType>(vehicle?.fuel_type ?? 'gasoline_91');
  const [odometer, setOdometer] = useState(vehicle ? String(vehicle.initial_odometer) : '');
  const [tankCapacity, setTankCapacity] = useState(
    vehicle?.tank_capacity != null ? String(vehicle.tank_capacity) : ''
  );
  const [budget, setBudget] = useState(
    vehicle?.monthly_budget != null ? String(vehicle.monthly_budget) : ''
  );
  const currency = useCurrency();
  const [error, setError] = useState<string | null>(null);

  const isOtherMake = makeCode === OTHER;
  const lookupMakeCode = makeCode && !isOtherMake ? makeCode : null;
  const makes = useVehicleMakes();
  const models = useVehicleModels(lookupMakeCode);
  // A custom make has no model list, so its model is always typed.
  const isOtherModel = isOtherMake || modelId === OTHER;

  const makeOptions: SelectOption<string>[] = [
    ...(makes.data ?? []).map((m) => ({
      value: m.code,
      label: lookupName(m, i18n.language),
      keywords: `${m.name_en} ${m.name_ar ?? ''}`,
    })),
    { value: OTHER, label: t('vehicles.other') },
  ];

  const modelOptions: SelectOption<number | typeof OTHER>[] = [
    ...(models.data ?? []).map((m) => ({
      value: m.id,
      label: lookupName(m, i18n.language),
      keywords: `${m.name_en} ${m.name_ar ?? ''}`,
    })),
    { value: OTHER, label: t('vehicles.other') },
  ];

  const yearOptions: SelectOption<number>[] = YEARS.map((y) => ({ value: y, label: String(y) }));

  const colorOptions: SelectOption<VehicleColorCode>[] = VEHICLE_COLORS.map((c) => ({
    value: c.code,
    label: t(`colors.${c.code}`),
    leading: <ColorSwatch hex={c.hex} />,
  }));

  const fuelOptions = FUEL_TYPES.map((value) => ({ value, label: t(`fuelTypes.${value}`) }));

  function changeMake(code: string) {
    if (code === makeCode) return;
    setMakeCode(code);
    setModelId(null);
    setCustomModel('');
  }

  function submit() {
    const make = isOtherMake
      ? customMake.trim()
      : (makes.data?.find((m) => m.code === makeCode)?.name_en ?? '');
    const model = isOtherModel
      ? customModel.trim()
      : (models.data?.find((m) => m.id === modelId)?.name_en ?? '');

    if (!make || !model) {
      setError(t('vehicles.requiredFields'));
      return;
    }

    const parsedOdometer = parseNumber(odometer);
    const parsedTank = parseNumber(tankCapacity);
    const parsedBudget = parseNumber(budget);
    if (
      (parsedOdometer !== null && !Number.isInteger(parsedOdometer)) ||
      Number.isNaN(parsedTank) ||
      Number.isNaN(parsedBudget) ||
      parsedBudget === 0
    ) {
      setError(t('vehicles.invalidNumber'));
      return;
    }

    setError(null);
    const values = {
      make,
      model,
      make_code: lookupMakeCode,
      model_id: typeof modelId === 'number' ? modelId : null,
      year,
      plate: plate.trim() || null,
      color,
      fuel_type: fuelType,
      initial_odometer: parsedOdometer ?? 0,
      tank_capacity: parsedTank,
      monthly_budget: parsedBudget,
    };
    const callbacks = {
      onSuccess: onSaved,
      onError: (e: Error) => setError(e.message || t('common.error')),
    };
    if (vehicle) {
      updateVehicle.mutate({ id: vehicle.id, ...values }, callbacks);
    } else {
      createVehicle.mutate(values, callbacks);
    }
  }

  return (
    <View style={styles.form}>
      <SelectField
        label={`${t('vehicles.make')} *`}
        placeholder={t('vehicles.selectMake')}
        options={makeOptions}
        value={makeCode}
        onChange={changeMake}
        loading={makes.isPending}
        searchable
      />
      {isOtherMake && (
        <TextField
          label={t('vehicles.otherMake')}
          value={customMake}
          onChangeText={setCustomMake}
          autoFocus
        />
      )}

      {isOtherMake ? (
        <TextField
          label={`${t('vehicles.model')} *`}
          value={customModel}
          onChangeText={setCustomModel}
        />
      ) : (
        <>
          <SelectField
            label={`${t('vehicles.model')} *`}
            placeholder={makeCode ? t('vehicles.selectModel') : t('vehicles.selectMakeFirst')}
            options={modelOptions}
            value={modelId}
            onChange={setModelId}
            disabled={!makeCode}
            loading={!!makeCode && models.isPending}
            searchable
          />
          {modelId === OTHER && (
            <TextField
              label={t('vehicles.otherModel')}
              value={customModel}
              onChangeText={setCustomModel}
              autoFocus
            />
          )}
        </>
      )}

      <View style={styles.row}>
        <View style={styles.flex}>
          <SelectField
            label={t('vehicles.year')}
            placeholder={t('vehicles.selectYear')}
            options={yearOptions}
            value={year}
            onChange={setYear}
            searchable
          />
        </View>
        <View style={styles.flex}>
          <SelectField
            label={t('vehicles.color')}
            placeholder={t('vehicles.selectColor')}
            options={colorOptions}
            value={color}
            onChange={setColor}
          />
        </View>
      </View>

      <TextField
        label={t('vehicles.plate')}
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />

      <ChipSelect
        label={t('vehicles.fuelType')}
        options={fuelOptions}
        value={fuelType}
        onChange={setFuelType}
      />

      <View style={styles.row}>
        <View style={styles.flex}>
          <TextField
            label={vehicle ? t('vehicles.startOdometer') : t('vehicles.currentOdometer')}
            value={odometer}
            onChangeText={setOdometer}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
        <View style={styles.flex}>
          <TextField
            label={t('vehicles.tankCapacity')}
            value={tankCapacity}
            onChangeText={setTankCapacity}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TextField
        label={t('budget.field', { currency: currencyLabel(currency, i18n.language) })}
        value={budget}
        onChangeText={setBudget}
        keyboardType="decimal-pad"
        placeholder={t('records.optional')}
      />

      {(error || makes.isError) && (
        <ThemedText themeColor="danger">{error ?? t('common.error')}</ThemedText>
      )}

      <Button
        title={vehicle ? t('records.saveChanges') : t('vehicles.save')}
        loading={saving}
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
