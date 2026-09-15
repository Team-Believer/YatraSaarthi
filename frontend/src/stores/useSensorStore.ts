import { create } from 'zustand';
import type { SensorCapabilities } from '../services/sensors/sensorCapabilities';
import type { PermissionState } from '../services/sensors/sensorPermissions';

interface SensorState {
  capabilities: SensorCapabilities;
  permissions: Record<string, PermissionState>;
  
  // Update functions
  updateCapabilities: (caps: SensorCapabilities) => void;
  updatePermission: (sensor: string, state: PermissionState) => void;
}

export const useSensorStore = create<SensorState>((set) => ({
  capabilities: {
    geolocation: false,
    deviceMotion: false,
    deviceOrientation: false,
    absoluteOrientation: false,
    permissions: false,
  },
  permissions: {},
  
  updateCapabilities: (caps) => set({ capabilities: caps }),
  updatePermission: (sensor, state) => set((prev) => ({
    permissions: { ...prev.permissions, [sensor]: state }
  })),
}));

