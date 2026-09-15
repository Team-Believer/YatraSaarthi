import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  distance_unit: 'km' | 'mi';
  speed_unit: 'km/h' | 'mph';
  voice_guidance: boolean;
  auto_tunnel_mode: boolean;
  high_accuracy_mode: boolean;
  sensor_fusion_enabled: boolean;
  vehicle_type: 'CAR' | 'TRUCK' | 'MOTORCYCLE' | 'SCOOTER';
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
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),
    }),
    {
      name: 'yatrasaarthi-settings',
    }
  )
);
