/**
 * YatraSaarthi - Unified Vehicle Profiles Configuration
 * 
 * Single source of truth for supported vehicle types, labels, and display icons.
 * Heavy Vehicle (Truck) is completely removed.
 */
import { CarFront, Bike, type LucideIcon } from 'lucide-react';

export type SupportedVehicleType = 'CAR' | 'MOTORCYCLE' | 'SCOOTER';

export interface VehicleProfile {
  type: SupportedVehicleType;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  maxSpeedKmh: number;
  dynamics: string;
}

export const VEHICLE_PROFILES: Record<SupportedVehicleType, VehicleProfile> = {
  CAR: {
    type: 'CAR',
    label: 'Passenger Car',
    shortLabel: 'Car',
    description: 'Zero-lateral velocity road behavior',
    icon: CarFront,
    maxSpeedKmh: 160,
    dynamics: 'Non-holonomic 4-wheel planar kinematics',
  },
  MOTORCYCLE: {
    type: 'MOTORCYCLE',
    label: 'Motorcycle',
    shortLabel: 'Motorcycle',
    description: 'Roll-aware vehicle dynamics',
    icon: Bike,
    maxSpeedKmh: 140,
    dynamics: '2-wheel roll-lean dynamics with non-holonomic constraint',
  },
  SCOOTER: {
    type: 'SCOOTER',
    label: 'Scooter / Moped',
    shortLabel: 'Scooter',
    description: 'Urban lightweight dynamics',
    icon: Bike,
    maxSpeedKmh: 90,
    dynamics: 'Low-inertia urban maneuverability',
  },
};

export const SUPPORTED_VEHICLES: VehicleProfile[] = [
  VEHICLE_PROFILES.CAR,
  VEHICLE_PROFILES.MOTORCYCLE,
  VEHICLE_PROFILES.SCOOTER,
];

/**
 * Sanitizes any raw or legacy vehicle type string to a supported VehicleType
 */
export function sanitizeVehicleType(rawType?: string | null): SupportedVehicleType {
  if (!rawType) return 'CAR';
  const upper = rawType.toUpperCase().trim();
  if (upper === 'MOTORCYCLE' || upper === 'MOTO' || upper === 'BIKE') return 'MOTORCYCLE';
  if (upper === 'SCOOTER' || upper === 'MOPED') return 'SCOOTER';
  if (upper === 'CAR' || upper === 'DRIVING' || upper === 'AUTOMOBILE') return 'CAR';
  // TRUCK or anything unsupported falls back safely to CAR
  return 'CAR';
}

/**
 * Returns human-readable label for a vehicle type
 */
export function getVehicleLabel(rawType?: string | null): string {
  const sanitized = sanitizeVehicleType(rawType);
  return VEHICLE_PROFILES[sanitized].shortLabel;
}

/**
 * Returns Lucide icon component for a vehicle type
 */
export function getVehicleIcon(rawType?: string | null): LucideIcon {
  const sanitized = sanitizeVehicleType(rawType);
  return VEHICLE_PROFILES[sanitized].icon;
}
