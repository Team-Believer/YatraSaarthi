import { useState } from 'react';
import {
  CarFront,
  Truck,
  Bike,
  Gauge,
  Ruler,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSettingsStore, type UserSettings } from '../stores/useSettingsStore';
import { clsx } from 'clsx';

interface VehicleOption {
  type: UserSettings['vehicle_type'];
  label: string;
  desc: string;
  icon: typeof CarFront;
}

const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'CAR',
    label: 'Passenger Car',
    desc: 'Zero-lateral velocity road behavior',
    icon: CarFront,
  },
  {
    type: 'TRUCK',
    label: 'Heavy Transport',
    desc: 'Dual-axle mass constraint',
    icon: Truck,
  },
  {
    type: 'MOTORCYCLE',
    label: 'Motorcycle',
    desc: 'Roll-aware vehicle dynamics',
    icon: Bike,
  },
  {
    type: 'SCOOTER',
    label: 'Scooter / Moped',
    desc: 'Urban lightweight dynamics',
    icon: Bike,
  },
];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();
  const [distanceUnitsOpen, setDistanceUnitsOpen] = useState(false);
  const [speedUnitsOpen, setSpeedUnitsOpen] = useState(false);

  const handleVehicleChange = (vehicle: UserSettings['vehicle_type']) => {
    updateSettings({ vehicle_type: vehicle });
  };

  return (
    <div className="w-full bg-[#F7F9F8] min-h-screen text-ink select-none font-sans">
      <div className="max-w-[1080px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 pb-32 md:pb-20 animate-in fade-in duration-300">
        
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <header className="space-y-1.5 pb-6 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold font-display text-ink tracking-tight">
              Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ink-body font-normal">
            Configure vehicle, display, and navigation preferences.
          </p>
        </header>

        {/* ========================================================================= */}
        {/* 01. VEHICLE PROFILE                                                       */}
        {/* ========================================================================= */}
        <section aria-labelledby="vehicle-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1">
              01 Vehicle
            </span>
            <h2 id="vehicle-heading" className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              Vehicle profile
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body font-sans mt-0.5">
              Choose the vehicle behavior model used by navigation constraints.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {VEHICLE_OPTIONS.map((v) => {
              const Icon = v.icon;
              const isSelected = settings.vehicle_type === v.type;

              return (
                <button
                  key={v.type}
                  type="button"
                  onClick={() => handleVehicleChange(v.type)}
                  className={clsx(
                    "w-full p-4 sm:px-5 flex items-center justify-between text-left transition-colors cursor-pointer group",
                    isSelected
                      ? "bg-[#083335]/[0.03]"
                      : "hover:bg-slate-50/80"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-[#083335] text-white"
                        : "bg-slate-100 text-[#4A6364] group-hover:text-[#083335]"
                    )}>
                      <Icon className="w-5 h-5" strokeWidth={1.8} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold font-display text-ink flex items-center gap-2">
                        <span>{v.label}</span>
                      </div>
                      <p className="text-xs text-ink-body mt-0.5 truncate">
                        {v.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-3">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#083335] text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-200 group-hover:border-slate-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200/60" />

        {/* ========================================================================= */}
        {/* 02. DISPLAY SETTINGS                                                      */}
        {/* ========================================================================= */}
        <section aria-labelledby="display-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1">
              02 Display
            </span>
            <h2 id="display-heading" className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              Display preferences
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body font-sans mt-0.5">
              Select measurement units for navigation velocity, speed limits, and distance.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            
            {/* Distance Units Row */}
            <div className="p-4 sm:px-5 space-y-3">
              <button
                type="button"
                onClick={() => setDistanceUnitsOpen(!distanceUnitsOpen)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#4A6364] flex items-center justify-center shrink-0">
                    <Ruler className="w-4.5 h-4.5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-display text-ink">
                      Distance units
                    </div>
                    <p className="text-xs text-ink-body mt-0.5">
                      {settings.distance_unit === 'km' ? 'Kilometers' : 'Miles'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-mono font-bold text-[#083335] bg-slate-100 px-2.5 py-1 rounded-lg">
                    {settings.distance_unit}
                  </span>
                  {distanceUnitsOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-ink" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-ink" />
                  )}
                </div>
              </button>

              {distanceUnitsOpen && (
                <div className="pt-2 pl-12 sm:pl-12.5 flex items-center gap-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ distance_unit: 'km' });
                      setDistanceUnitsOpen(false);
                    }}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border",
                      settings.distance_unit === 'km'
                        ? "bg-[#083335] text-white border-[#083335]"
                        : "bg-slate-50 hover:bg-slate-100 text-ink border-slate-200"
                    )}
                  >
                    Kilometers (km)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ distance_unit: 'mi' });
                      setDistanceUnitsOpen(false);
                    }}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border",
                      settings.distance_unit === 'mi'
                        ? "bg-[#083335] text-white border-[#083335]"
                        : "bg-slate-50 hover:bg-slate-100 text-ink border-slate-200"
                    )}
                  >
                    Miles (mi)
                  </button>
                </div>
              )}
            </div>

            {/* Speed Units Row */}
            <div className="p-4 sm:px-5 space-y-3">
              <button
                type="button"
                onClick={() => setSpeedUnitsOpen(!speedUnitsOpen)}
                className="w-full flex items-center justify-between text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-[#4A6364] flex items-center justify-center shrink-0">
                    <Gauge className="w-4.5 h-4.5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold font-display text-ink">
                      Speed units
                    </div>
                    <p className="text-xs text-ink-body mt-0.5">
                      {settings.speed_unit === 'km/h' ? 'Kilometers per hour' : 'Miles per hour'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs font-mono font-bold text-[#083335] bg-slate-100 px-2.5 py-1 rounded-lg">
                    {settings.speed_unit}
                  </span>
                  {speedUnitsOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-ink" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-ink" />
                  )}
                </div>
              </button>

              {speedUnitsOpen && (
                <div className="pt-2 pl-12 sm:pl-12.5 flex items-center gap-2 animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ speed_unit: 'km/h' });
                      setSpeedUnitsOpen(false);
                    }}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border",
                      settings.speed_unit === 'km/h'
                        ? "bg-[#083335] text-white border-[#083335]"
                        : "bg-slate-50 hover:bg-slate-100 text-ink border-slate-200"
                    )}
                  >
                    km/h
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ speed_unit: 'mph' });
                      setSpeedUnitsOpen(false);
                    }}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer border",
                      settings.speed_unit === 'mph'
                        ? "bg-[#083335] text-white border-[#083335]"
                        : "bg-slate-50 hover:bg-slate-100 text-ink border-slate-200"
                    )}
                  >
                    mph
                  </button>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200/60" />

        {/* ========================================================================= */}
        {/* 03. NAVIGATION ENGINE                                                     */}
        {/* ========================================================================= */}
        <section aria-labelledby="engine-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1">
              03 Engine
            </span>
            <h2 id="engine-heading" className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              Navigation engine
            </h2>
            <p className="text-xs sm:text-[13px] text-ink-body font-sans mt-0.5">
              Configure how YatraSaarthi responds to GNSS availability and smartphone sensor data.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            
            {/* Setting 1: Automatic GNSS outage detection */}
            <div className="p-4 sm:px-5 flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold font-display text-ink">
                  Automatic GNSS outage detection
                </div>
                <p className="text-xs text-ink-body mt-0.5 leading-relaxed">
                  Automatically switch to dead-reckoning when GNSS becomes unavailable.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.auto_tunnel_mode}
                onClick={() => updateSettings({ auto_tunnel_mode: !settings.auto_tunnel_mode })}
                className={clsx(
                  "w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                  settings.auto_tunnel_mode ? "bg-[#083335]" : "bg-slate-200"
                )}
              >
                <div
                  className={clsx(
                    "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                    settings.auto_tunnel_mode ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Setting 2: High-rate inertial sensor fusion */}
            <div className="p-4 sm:px-5 flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold font-display text-ink">
                  High-rate inertial sensor fusion
                </div>
                <p className="text-xs text-ink-body mt-0.5 leading-relaxed">
                  Use accelerometer and gyroscope measurements alongside available GNSS updates.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.sensor_fusion_enabled}
                onClick={() => updateSettings({ sensor_fusion_enabled: !settings.sensor_fusion_enabled })}
                className={clsx(
                  "w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                  settings.sensor_fusion_enabled ? "bg-[#083335]" : "bg-slate-200"
                )}
              >
                <div
                  className={clsx(
                    "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                    settings.sensor_fusion_enabled ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {/* Setting 3: High-precision device location */}
            <div className="p-4 sm:px-5 flex items-center justify-between gap-4">
              <div className="min-w-0 pr-2">
                <div className="text-sm font-semibold font-display text-ink">
                  High-precision device location
                </div>
                <p className="text-xs text-ink-body mt-0.5 leading-relaxed">
                  Request higher-accuracy device location when supported by the browser and device.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.high_accuracy_mode}
                onClick={() => updateSettings({ high_accuracy_mode: !settings.high_accuracy_mode })}
                className={clsx(
                  "w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer",
                  settings.high_accuracy_mode ? "bg-[#083335]" : "bg-slate-200"
                )}
              >
                <div
                  className={clsx(
                    "w-5 h-5 rounded-full bg-white transition-transform shadow-xs",
                    settings.high_accuracy_mode ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-200/60" />

        {/* ========================================================================= */}
        {/* 04. ABOUT YATRASAARTHI                                                    */}
        {/* ========================================================================= */}
        <section aria-labelledby="about-heading" className="space-y-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1">
              04 System
            </span>
            <h2 id="about-heading" className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              About YatraSaarthi
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden text-xs sm:text-[13px]">
            <div className="p-4 sm:px-5 flex items-center justify-between">
              <span className="text-ink-body font-medium">Version</span>
              <span className="font-mono font-semibold text-ink">1.0.0</span>
            </div>

            <div className="p-4 sm:px-5 flex items-center justify-between">
              <span className="text-ink-body font-medium">Navigation engine</span>
              <span className="font-medium text-ink">E5 CNN-GRU motion estimator + Invariant EKF</span>
            </div>

            <div className="p-4 sm:px-5 flex items-center justify-between">
              <span className="text-ink-body font-medium">Build</span>
              <span className="font-mono font-semibold text-emerald-700">Production</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
