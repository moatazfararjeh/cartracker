import '@/lib/local-storage';

import { createContext, use, useState, type PropsWithChildren } from 'react';

import { useVehicles, type Vehicle } from '@/features/vehicles/api';

const STORAGE_KEY = 'car-tracker.active-vehicle';

type ActiveVehicleContextValue = {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  setActiveVehicleId: (id: string) => void;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
};

const ActiveVehicleContext = createContext<ActiveVehicleContextValue | null>(null);

function readStoredId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The vehicle the whole app is showing; remembered across launches. */
export function ActiveVehicleProvider({ children }: PropsWithChildren) {
  const { data, isPending, isError, refetch } = useVehicles();
  const [selectedId, setSelectedId] = useState<string | null>(readStoredId);

  const vehicles = data ?? [];
  // Fall back to the first vehicle when nothing (or a deleted vehicle) is selected.
  const activeVehicle = vehicles.find((v) => v.id === selectedId) ?? vehicles[0] ?? null;

  function setActiveVehicleId(id: string) {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Selection still applies for this session.
    }
  }

  return (
    <ActiveVehicleContext
      value={{ vehicles, activeVehicle, setActiveVehicleId, isPending, isError, refetch }}>
      {children}
    </ActiveVehicleContext>
  );
}

export function useActiveVehicle() {
  const value = use(ActiveVehicleContext);
  if (!value) {
    throw new Error('useActiveVehicle must be used inside <ActiveVehicleProvider>');
  }
  return value;
}
