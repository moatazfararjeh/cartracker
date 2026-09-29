import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { ColorSwatch, SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { FUEL_TYPES, useCreateVehicle, type FuelType } from '@/features/vehicles/api';
import {
  lookupName,
  useVehicleMakes,
  useVehicleModels,
  VEHICLE_COLORS,
  vehicleYears,
  type VehicleColorCode,
} from '@/features/vehicles/lookups';
import { parseNumber } from '@/lib/numbers';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

/** Picker value meaning "not in the list, type it". */
const OTHER = '__other__';

const YEARS = vehicleYears();

export default function NewVehicleScreen() {
  const { t, i18n } = useTranslation();
  const createVehicle = useCreateVehicle();
  const { setActiveVehicleId } = useActiveVehicle();

  const [makeCode, setMakeCode] = useState<string | null>(null);
  const [customMake, setCustomMake] = useState('');
  const [modelId, setModelId] = useState<number | typeof OTHER | null>(null);
  const [customModel, setCustomModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [color, setColor] = useState<VehicleColorCode | null>(null);
  const [plate, setPlate] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('gasoline_91');
  const [odometer, setOdometer] = useState('');
  const [tankCapacity, setTankCapacity] = useState('');
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
    if ((parsedOdometer !== null && !Number.isInteger(parsedOdometer)) || Number.isNaN(parsedTank)) {
      setError(t('vehicles.invalidNumber'));
      return;
    }

    setError(null);
    createVehicle.mutate(
      {
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
      },
      {
        onSuccess: (vehicle) => {
          setActiveVehicleId(vehicle.id);
          router.back();
        },
        onError: (e) => setError(e.message || t('common.error')),
      }
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic">
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
                label={t('vehicles.currentOdometer')}
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

          {(error || makes.isError) && (
            <ThemedText themeColor="danger">{error ?? t('common.error')}</ThemedText>
          )}

          <Button title={t('vehicles.save')} loading={createVehicle.isPending} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 1.5,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
