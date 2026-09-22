import { Settings as SettingsIcon, Car, Truck, Bike, Shield, Gauge, Info } from 'lucide-react';
import { useSettingsStore, type UserSettings } from '../stores/useSettingsStore';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  const handleVehicleChange = (vehicle: UserSettings['vehicle_type']) => {
    updateSettings({ vehicle_type: vehicle });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 text-slate-900">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-slate-200/80 pb-5">
        <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-xs">
          <SettingsIcon className="w-5 h-5 text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            System Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Configure vehicle kinematic constraints & navigation engine parameters
          </p>
        </div>
      </div>

      {/* 1. Vehicle Kinematic Profile Selection */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-brand-600" />
            Vehicle Kinematic Profile
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Selects the Non-Holonomic Constraint (NHC) parameters, lateral velocity suppression thresholds, and wheel dynamics used by the InEKF state propagation filter.
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
                  "p-4 rounded-2xl border text-left transition-all flex flex-col justify-between min-h-[110px] press-scale shadow-2xs",
                  isSelected
                    ? "bg-brand-50/90 border-brand-500 text-slate-900 ring-1 ring-brand-500"
                    : "bg-white border-slate-200/80 hover:border-slate-300 text-slate-700"
                )}
              >
                <div className="flex justify-between items-center w-full">
                  <div className={clsx(
                    "p-2 rounded-xl",
                    isSelected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold text-brand-700 bg-white px-2 py-0.5 rounded border border-brand-200">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <div className="font-bold text-xs sm:text-sm text-slate-900">{v.label}</div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{v.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Display Units & Sensor Calibration */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-600" />
            Display Units & Velocity Scale
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Choose metric or imperial display standards for velocity and distance metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Distance Units */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">Distance Units</div>
              <div className="text-[11px] text-slate-500">Kilometers vs Miles</div>
            </div>
            <div className="flex bg-white rounded-xl p-1 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => updateSettings({ distance_unit: 'km' })}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  settings.distance_unit === 'km' ? "bg-brand-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                km
              </button>
              <button
                onClick={() => updateSettings({ distance_unit: 'mi' })}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  settings.distance_unit === 'mi' ? "bg-brand-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                mi
              </button>
            </div>
          </div>

          {/* Speed Units */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <div className="font-bold text-xs sm:text-sm text-slate-900">Speed Units</div>
              <div className="text-[11px] text-slate-500">Kilometers/hour vs Miles/hour</div>
            </div>
            <div className="flex bg-white rounded-xl p-1 border border-slate-200 text-xs font-bold">
              <button
                onClick={() => updateSettings({ speed_unit: 'km/h' })}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  settings.speed_unit === 'km/h' ? "bg-brand-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                km/h
              </button>
              <button
                onClick={() => updateSettings({ speed_unit: 'mph' })}
                className={clsx(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  settings.speed_unit === 'mph' ? "bg-brand-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                mph
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Fusion & Outage Toggles */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" />
            Navigation Engine Toggles
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure automated InEKF filter transitions and sensor streaming settings.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'auto_tunnel_mode',
              title: 'Automatic Outage Detection & DR Engagement',
              desc: 'Automatically engage InEKF strapdown dead reckoning when GNSS satellite loss is detected.'
            },
            {
              key: 'sensor_fusion_enabled',
              title: '6-DoF High-Rate Inertial Sensor Fusion',
              desc: 'Fuse 50 Hz accelerometer and gyroscope streams with discrete GNSS position updates.'
            },
            {
              key: 'high_accuracy_mode',
              title: 'High-Precision Browser Geolocation',
              desc: 'Request continuous maximum-precision location fixes from the browser Geolocation API.'
            }
          ].map((toggle) => {
            const active = Boolean(settings[toggle.key as keyof UserSettings]);
            return (
              <div key={toggle.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="pr-4">
                  <div className="font-bold text-xs sm:text-sm text-slate-900">{toggle.title}</div>
                  <div className="text-[11px] text-slate-500 max-w-xl mt-0.5 leading-snug">{toggle.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ [toggle.key]: !active })}
                  className={clsx(
                    "w-12 h-6.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer shadow-2xs",
                    active ? "bg-brand-600" : "bg-slate-300"
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
      <div className="p-4.5 bg-brand-50/70 border border-brand-100/90 rounded-3xl text-xs text-brand-950 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-brand-600 shrink-0" />
          <div>
            <div className="font-bold text-brand-900">YatraSaarthi Production Build</div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              Lie-Group Invariant Extended Kalman Filter (InEKF) • E5 Dilated Temporal ConvNet
            </div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold text-brand-700 bg-white px-2.5 py-1 rounded-lg border border-brand-200 shrink-0">
          v1.0.0-prod
        </span>
      </div>
    </div>
  );
}
