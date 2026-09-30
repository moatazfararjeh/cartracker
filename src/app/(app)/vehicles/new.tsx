import { router } from 'expo-router';

import { FormScreen } from '@/components/form-screen';
import { VehicleForm } from '@/components/vehicle-form';
import { useActiveVehicle } from '@/providers/active-vehicle-provider';

export default function NewVehicleScreen() {
  const { setActiveVehicleId } = useActiveVehicle();

  return (
    <FormScreen>
      <VehicleForm
        onSaved={(vehicle) => {
          setActiveVehicleId(vehicle.id);
          router.back();
        }}
      />
    </FormScreen>
  );
}
