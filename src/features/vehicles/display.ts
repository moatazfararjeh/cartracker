import type { TFunction } from 'i18next';

import type { Vehicle } from '@/features/vehicles/api';
import { lookupName } from '@/features/vehicles/lookups';
import { formatNumber } from '@/lib/format';

/** e.g. "Toyota Camry · 2022" in the UI language. */
export function vehicleTitle(vehicle: Vehicle, language: string) {
  const make = vehicle.make_ref ? lookupName(vehicle.make_ref, language) : vehicle.make;
  const model = vehicle.model_ref ? lookupName(vehicle.model_ref, language) : vehicle.model;
  const name = `${make} ${model}`;
  return vehicle.year ? `${name} · ${vehicle.year}` : name;
}

/** First-strong isolate: keeps an Arabic plate from reordering the Latin text around it. */
const isolate = (text: string) => `\u2068${text}\u2069`;

/** e.g. "ABC 1234 · 82,450 km". */
export function vehicleSubtitle(vehicle: Vehicle, t: TFunction, language: string) {
  const km = t('vehicles.km', { value: formatNumber(vehicle.current_odometer, language) });
  if (!vehicle.plate) return km;
  // Lead with the UI direction mark: browsers guess a paragraph's direction from its first
  // strong character, which would otherwise be the Arabic plate.
  const mark = language === 'ar' ? '\u200F' : '\u200E';
  return `${mark}${isolate(vehicle.plate)} · ${km}`;
}
