import { Settings as SettingsIcon, Car, Truck, Bike, Shield, Gauge, ChevronRight, Map, Radio, Layers, Bell, Lock, Info } from 'lucide-react';
import { useSettingsStore, type UserSettings } from '../stores/useSettingsStore';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  const handleVehicleChange = (vehicle: UserSettings['vehicle_type']) => {
    updateSettings({ vehicle_type: vehicle });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
          <SettingsIcon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-brand-navy">Settings</h1>
          <p className="text-gray-500 text-[10px] md:text-sm">Configure navigation & app preferences</p>
        </div>
      </div>

      {/* Mobile: Navigation settings group */}
      <div className="md:hidden space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Navigation</h3>
        <div className="bg-white rounded-2xl border border-brand-50 shadow-sm overflow-hidden divide-y divide-gray-100">
          {[
            { label: 'Map Preferences', icon: Map, subtitle: 'Style, layers, labels' },
            { label: 'GNSS / NavIC Settings', icon: Radio, subtitle: 'Satellite constellation' },
            { label: 'Sensor Fusion', icon: Layers, subtitle: 'IMU, magnetometer config' },
            { label: 'Route Preferences', icon: ChevronRight, subtitle: 'Avoid tolls, highways' },
            { label: 'Units & Display', icon: Gauge, subtitle: `${settings.distance_unit} / ${settings.speed_unit}` },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-brand-navy">{item.label}</div>
                  <div className="text-[10px] text-gray-500">{item.subtitle}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            );
          })}
        </div>

        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 pt-2">App</h3>
        <div className="bg-white rounded-2xl border border-brand-50 shadow-sm overflow-hidden divide-y divide-gray-100">
          {[
            { label: 'Notifications', icon: Bell },
            { label: 'Data & Privacy', icon: Lock },
            { label: 'About YatraSaarthi', icon: Info },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-4 px-4 py-3.5">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-semibold text-brand-navy">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Full settings panels */}
      <div className="hidden md:block space-y-6">
        {/* Vehicle Selection */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4">
          <h3 className="font-bold text-brand-navy text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-brand-600" /> Vehicle Kinematic Profile
          </h3>
          <p className="text-xs text-gray-500">
            Selects the Non-Holonomic Constraint (NHC) parameters and wheel motion models used in the InEKF state propagation.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            {[
              { type: 'CAR', label: 'Passenger Car', icon: Car, desc: 'Rigid zero-lateral velocity' },
              { type: 'TRUCK', label: 'Heavy Truck', icon: Truck, desc: 'High mass, dual-axle constraint' },
              { type: 'MOTORCYCLE', label: 'Motorcycle', icon: Bike, desc: 'Roll-leaning relaxed NHC' },
              { type: 'SCOOTER', label: 'Scooter / Moped', icon: Bike, desc: 'Light weight urban dynamics' }
            ].map((v) => {
              const Icon = v.icon;
              const isSelected = settings.vehicle_type === v.type;
              return (
                <button
                  key={v.type}
                  onClick={() => handleVehicleChange(v.type as UserSettings['vehicle_type'])}
                  className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 ${
                    isSelected
                      ? 'bg-brand-50 border-brand-600 text-brand-900 shadow-sm'
                      : 'bg-white border-gray-100 hover:border-brand-200 text-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-brand-600' : 'text-gray-400'}`} />
                    {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{v.label}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{v.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Units */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4">
          <h3 className="font-bold text-brand-navy text-lg flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-600" /> Units & Calibration
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div>
                <div className="font-semibold text-sm text-brand-navy">Distance Units</div>
                <div className="text-xs text-gray-500">Metric (Kilometers) vs Imperial (Miles)</div>
              </div>
              <div className="flex bg-white rounded-xl p-1 border border-gray-200 text-xs font-semibold">
                <button
                  onClick={() => updateSettings({ distance_unit: 'km' })}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    settings.distance_unit === 'km' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-brand-900'
                  }`}
                >
                  km
                </button>
                <button
                  onClick={() => updateSettings({ distance_unit: 'mi' })}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    settings.distance_unit === 'mi' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-brand-900'
                  }`}
                >
                  mi
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div>
                <div className="font-semibold text-sm text-brand-navy">Speed Units</div>
                <div className="text-xs text-gray-500">km/h vs mph</div>
              </div>
              <div className="flex bg-white rounded-xl p-1 border border-gray-200 text-xs font-semibold">
                <button
                  onClick={() => updateSettings({ speed_unit: 'km/h' })}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    settings.speed_unit === 'km/h' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-brand-900'
                  }`}
                >
                  km/h
                </button>
                <button
                  onClick={() => updateSettings({ speed_unit: 'mph' })}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    settings.speed_unit === 'mph' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:text-brand-900'
                  }`}
                >
                  mph
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fusion Toggles */}
        <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm space-y-4">
          <h3 className="font-bold text-brand-navy text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-600" /> Navigation Toggles
          </h3>

          <div className="space-y-3">
            {[
              {
                key: 'auto_tunnel_mode',
                title: 'Automatic Tunnel & Outage Transition',
                desc: 'Automatically engage InEKF strapdown dead reckoning when GNSS satellite loss is detected.'
              },
              {
                key: 'sensor_fusion_enabled',
                title: '6-DoF Inertial Sensor Fusion',
                desc: 'Fuse high-frequency accelerometer and gyroscope measurements with low-frequency GNSS fixes.'
              },
              {
                key: 'high_accuracy_mode',
                title: 'High Accuracy Geolocation',
                desc: 'Request continuous maximum-precision location fixes from the device browser API.'
              }
            ].map((toggle) => {
              const active = settings[toggle.key as keyof UserSettings] as boolean;
              return (
                <div key={toggle.key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div>
                    <div className="font-semibold text-sm text-brand-navy">{toggle.title}</div>
                    <div className="text-xs text-gray-500 max-w-md mt-0.5">{toggle.desc}</div>
                  </div>
                  <button
                    onClick={() => updateSettings({ [toggle.key]: !active })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      active ? 'bg-brand-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                        active ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
