import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type SupportedVehicleType, sanitizeVehicleType } from '../utils/navigation/vehicleProfiles';

export interface UserSettings {
  distance_unit: 'km' | 'mi';
  speed_unit: 'km/h' | 'mph';
  voice_guidance: boolean;
  auto_tunnel_mode: boolean;
  high_accuracy_mode: boolean;
  sensor_fusion_enabled: boolean;
  vehicle_type: SupportedVehicleType;
  theme: 'light' | 'dark';
}

interface SettingsState {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        distance_unit: 'km',
        speed_unit: 'km/h',
        voice_guidance: true,
        auto_tunnel_mode: true,
        high_accuracy_mode: true,
        sensor_fusion_enabled: true,
        vehicle_type: 'CAR',
        theme: 'light',
      },
      updateSettings: (newSettings) => 
        set((state) => {
          const updated = { ...state.settings, ...newSettings };
          if (updated.vehicle_type) {
            updated.vehicle_type = sanitizeVehicleType(updated.vehicle_type);
          }
          return { settings: updated };
        }),
    }),
    {
      name: 'yatrasaarthi-settings',
      migrate: (persistedState: any) => {
        if (persistedState && persistedState.settings) {
          persistedState.settings.vehicle_type = sanitizeVehicleType(persistedState.settings.vehicle_type);
        }
        return persistedState;
      },
    }
  )
);

