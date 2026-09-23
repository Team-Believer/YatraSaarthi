import { Settings as SettingsIcon, Car, Truck, Bike, Shield, Gauge, Info } from 'lucide-react';
import { useSettingsStore, type UserSettings } from '../stores/useSettingsStore';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  const handleVehicleChange = (vehicle: UserSettings['vehicle_type']) => {
    updateSettings({ vehicle_type: vehicle });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 text-ink select-none">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-border-clean pb-5">
        <div className="p-2.5 bg-[#083335] text-white rounded-2xl shadow-xs">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-ink-body font-normal">
            Configure vehicle kinematic constraints & navigation engine parameters
          </p>
        </div>
      </div>

      {/* 1. Vehicle Kinematic Profile Selection */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
        <div>
          <h3 className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-ink" />
            Vehicle profile
          </h3>
          <p className="text-xs text-ink-body mt-1 leading-relaxed">
            Selects non-holonomic constraint (NHC) parameters, lateral velocity suppression thresholds, and wheel dynamics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            { type: 'CAR', label: 'Passenger Car', icon: Car, desc: 'Zero-lateral velocity rigid NHC' },
            { type: 'TRUCK', label: 'Heavy Transport', icon: Truck, desc: 'Dual-axle mass constraint' },
            { type: 'MOTORCYCLE', label: 'Motorcycle', icon: Bike, desc: 'Roll-leaning relaxed dynamics' },
            { type: 'SCOOTER', label: 'Scooter / Moped', icon: Bike, desc: 'Urban light agility parameters' }
          ].map((v) => {
            const Icon = v.icon;
            const isSelected = settings.vehicle_type === v.type;
            return (
              <button
                key={v.type}
                onClick={() => handleVehicleChange(v.type as UserSettings['vehicle_type'])}
                className={clsx(
                  "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[110px] press-scale cursor-pointer",
                  isSelected
                    ? "bg-[#EAF0F0] border-[#083335] text-ink ring-1 ring-[#083335]"
                    : "bg-white border-border-clean hover:bg-canvas-softer text-ink-body hover:text-ink"
                )}
              >
                <div className="flex justify-between items-center w-full">
                  <div className={clsx(
                    "p-2 rounded-full",
                    isSelected ? "bg-[#083335] text-white" : "bg-canvas-soft text-ink"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-medium text-ink bg-white px-2 py-0.5 rounded-full border border-border-clean">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-semibold text-xs sm:text-sm text-ink">{v.label}</div>
                  <div className="text-[11px] text-ink-body mt-0.5 leading-snug">{v.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Display Units & Velocity Scale */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
        <div>
          <h3 className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
            <Gauge className="w-5 h-5 text-ink" />
            Display units
          </h3>
          <p className="text-xs text-ink-body mt-1">
            Choose metric or imperial display standards for velocity and distance metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Distance Units */}
          <div className="flex items-center justify-between p-4 bg-canvas-soft rounded-2xl border border-border-clean">
            <div>
              <div className="font-semibold text-xs sm:text-sm text-ink">Distance units</div>
              <div className="text-[11px] text-ink-body">Kilometers vs Miles</div>
            </div>
            <div className="flex bg-white rounded-full p-1 border border-border-clean text-xs font-medium">
              <button
                onClick={() => updateSettings({ distance_unit: 'km' })}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full transition-colors cursor-pointer",
                  settings.distance_unit === 'km' ? "bg-[#083335] text-white" : "text-ink-body hover:text-ink"
                )}
              >
                km
              </button>
              <button
                onClick={() => updateSettings({ distance_unit: 'mi' })}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full transition-colors cursor-pointer",
                  settings.distance_unit === 'mi' ? "bg-[#083335] text-white" : "text-ink-body hover:text-ink"
                )}
              >
                mi
              </button>
            </div>
          </div>

          {/* Speed Units */}
          <div className="flex items-center justify-between p-4 bg-canvas-soft rounded-2xl border border-border-clean">
            <div>
              <div className="font-semibold text-xs sm:text-sm text-ink">Speed units</div>
              <div className="text-[11px] text-ink-body">Kilometers/hour vs Miles/hour</div>
            </div>
            <div className="flex bg-white rounded-full p-1 border border-border-clean text-xs font-medium">
              <button
                onClick={() => updateSettings({ speed_unit: 'km/h' })}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full transition-colors cursor-pointer",
                  settings.speed_unit === 'km/h' ? "bg-[#083335] text-white" : "text-ink-body hover:text-ink"
                )}
              >
                km/h
              </button>
              <button
                onClick={() => updateSettings({ speed_unit: 'mph' })}
                className={clsx(
                  "px-3.5 py-1.5 rounded-full transition-colors cursor-pointer",
                  settings.speed_unit === 'mph' ? "bg-[#083335] text-white" : "text-ink-body hover:text-ink"
                )}
              >
                mph
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Engine Toggles */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-border-clean shadow-2xs space-y-4">
        <div>
          <h3 className="font-bold text-ink text-base sm:text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-ink" />
            Navigation engine toggles
          </h3>
          <p className="text-xs text-ink-body mt-1">
            Configure automated InEKF filter transitions and sensor streaming settings.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'auto_tunnel_mode',
              title: 'Automatic outage detection & DR engagement',
              desc: 'Automatically engage InEKF strapdown dead reckoning when GNSS satellite loss is detected.'
            },
            {
              key: 'sensor_fusion_enabled',
              title: '6-DoF high-rate inertial sensor fusion',
              desc: 'Fuse 50 Hz accelerometer and gyroscope streams with discrete GNSS position updates.'
            },
            {
              key: 'high_accuracy_mode',
              title: 'High-precision browser geolocation',
              desc: 'Request continuous maximum-precision location fixes from the browser Geolocation API.'
            }
          ].map((toggle) => {
            const active = Boolean(settings[toggle.key as keyof UserSettings]);
            return (
              <div key={toggle.key} className="flex items-center justify-between p-4 bg-canvas-soft rounded-2xl border border-border-clean">
                <div className="pr-4">
                  <div className="font-semibold text-xs sm:text-sm text-ink">{toggle.title}</div>
                  <div className="text-[11px] text-ink-body max-w-xl mt-0.5 leading-snug">{toggle.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ [toggle.key]: !active })}
                  className={clsx(
                    "w-12 h-6.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer shadow-2xs",
                    active ? "bg-[#083335]" : "bg-neutral-300"
                  )}
                >
                  <div
                    className={clsx(
                      "w-5.5 h-5.5 rounded-full bg-white transition-transform shadow-xs",
                      active ? "translate-x-5.5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Platform Architecture Info */}
      <div className="p-4.5 bg-canvas-soft border border-border-clean rounded-2xl text-xs text-ink flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-ink shrink-0" />
          <div>
            <div className="font-semibold text-ink">Yatra-Sarthi build</div>
            <div className="text-[11px] text-ink-body mt-0.5">
              Lie-Group Invariant Extended Kalman Filter (InEKF) • E5 Dilated Temporal ConvNet
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-medium text-ink bg-white px-3 py-1 rounded-full border border-border-clean shrink-0 shadow-2xs">
          v1.0.0-prod
        </span>
      </div>
    </div>
  );
}
