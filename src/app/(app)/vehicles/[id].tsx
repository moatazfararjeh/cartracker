import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { VehicleForm } from '@/components/vehicle-form';
import { useDeleteVehicle } from '@/features/vehicles/api';
import { vehicleTitle } from '@/features/vehicles/display';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';
import { useConfirm } from '@/providers/confirm-provider';

export default function EditVehicleScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vehicles } = useActiveVehicle();
  const remove = useDeleteVehicle();
  const confirm = useConfirm();
  const vehicle = vehicles.find((v) => v.id === id);

  async function deleteVehicle() {
    if (!vehicle) return;
    const ok = await confirm({
      title: t('vehicles.deleteTitle', { name: vehicleTitle(vehicle, i18n.language) }),
      message: t('vehicles.deleteMessage'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(vehicle.id, { onSuccess: () => router.back() });
  }

  return (
    <FormScreen>
      <Stack.Screen options={{ title: t('vehicles.editTitle') }} />
      {!vehicle ? (
        <ThemedText themeColor="danger">{t('records.notFound')}</ThemedText>
      ) : (
        <>
          <VehicleForm key={vehicle.id} vehicle={vehicle} onSaved={() => router.back()} />
          <Button
            variant="danger"
            title={t('vehicles.delete')}
            loading={remove.isPending}
            onPress={deleteVehicle}
          />
          {remove.error && (
            <ThemedText themeColor="danger">{remove.error.message || t('common.error')}</ThemedText>
          )}
        </>
      )}
    </FormScreen>
  );
}
