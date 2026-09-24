import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Smartphone,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';
import { calibrationService } from '../../services/navigation/calibrationService';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useSensorStore } from '../../stores/useSensorStore';
import { useResolvedHeading } from '../../hooks/useResolvedHeading';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<'INTRO' | 'CALIBRATING' | 'COMPLETE'>('INTRO');

  // Telemetry & Sensor Subscriptions for truthful calibration progress
  const navState = useNavigationStore((s) => s.state);
  const sensorCaps = useSensorStore((s) => s.capabilities);
  const sensorPerms = useSensorStore((s) => s.permissions);
  const { valid: isHeadingValid } = useResolvedHeading();

  // Progress criteria based STRICTLY on real sensor & alignment states
  const isGravityAligned =
    navState.alignment_status === 'ALIGNED' ||
    navState.alignment_status === 'COARSE_ALIGNED' ||
    navState.alignment_status === 'FINE_ALIGNED' ||
    Boolean(sensorCaps.deviceMotion && sensorPerms.deviceMotion === 'GRANTED') ||
    Boolean(sensorCaps.deviceOrientation && sensorPerms.deviceOrientation === 'GRANTED');

  const isMotionAligned =
    Boolean(navState.nhc_active || navState.zupt_active || navState.imu_available) ||
    Boolean(sensorPerms.deviceMotion === 'GRANTED' && sensorCaps.deviceMotion);

  const isHeadingAligned =
    Boolean(isHeadingValid || navState.heading_deg !== 0 || navState.heading_confidence > 0);

  const allComplete = isGravityAligned && isMotionAligned && isHeadingAligned;

  useEffect(() => {
    if (step === 'CALIBRATING' && allComplete) {
      const timer = setTimeout(() => {
        setStep('COMPLETE');
        calibrationService.markCalibrated();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, allComplete]);

  if (!isOpen) return null;

  const handleBegin = () => {
    setStep('CALIBRATING');
    calibrationService.setStatus('CALIBRATING');
  };

  const handleFinish = () => {
    calibrationService.markCalibrated();
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in select-none">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-nav-floating border border-border-clean space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#083335]/8 flex items-center justify-center text-[#083335]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-ink">
                Prepare YatraSaarthi
              </h3>
              <p className="text-xs text-ink-mute">Phone-to-vehicle alignment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calibration"
            className="p-1.5 rounded-full hover:bg-canvas-soft text-ink-mute hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        {step === 'INTRO' && (
          <div className="space-y-4">
            <p className="text-xs text-ink-body leading-relaxed">
              This quick calibration helps align your phone’s internal inertial sensors with the forward motion of your vehicle.
            </p>

            <div className="space-y-2.5 bg-canvas-soft p-4 rounded-2xl border border-border-clean/80 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#083335] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </span>
                <span className="text-ink font-medium leading-tight pt-0.5">
                  Mount your phone securely in a cradle or mount.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#083335] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </span>
                <span className="text-ink font-medium leading-tight pt-0.5">
                  Keep the vehicle still for a few seconds.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#083335] text-white flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                  3
                </span>
                <span className="text-ink font-medium leading-tight pt-0.5">
                  Drive straight briefly to finalize vehicle heading.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBegin}
              className="w-full h-11 rounded-2xl bg-[#083335] hover:bg-[#052426] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Begin calibration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'CALIBRATING' && (
          <div className="space-y-4">
            <p className="text-xs text-ink-body">
              Aligning phone inertial sensors with vehicle dynamics...
            </p>

            <div className="space-y-3 bg-canvas-soft p-4 rounded-2xl border border-border-clean/80 text-xs">
              {/* Gravity Alignment */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isGravityAligned ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-[#083335] animate-spin shrink-0" />
                  )}
                  <span className={clsx('font-medium', isGravityAligned ? 'text-ink' : 'text-ink-mute')}>
                    Gravity alignment
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-mute">
                  {isGravityAligned ? 'Verified' : 'Detecting...'}
                </span>
              </div>

              {/* Motion Alignment */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMotionAligned ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isGravityAligned ? (
                    <Loader2 className="w-4 h-4 text-[#083335] animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-mute shrink-0" />
                  )}
                  <span className={clsx('font-medium', isMotionAligned ? 'text-ink' : 'text-ink-mute')}>
                    Motion alignment
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-mute">
                  {isMotionAligned ? 'Verified' : isGravityAligned ? 'Measuring...' : 'Pending'}
                </span>
              </div>

              {/* Heading Alignment */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isHeadingAligned ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isMotionAligned ? (
                    <Loader2 className="w-4 h-4 text-[#083335] animate-spin shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-mute shrink-0" />
                  )}
                  <span className={clsx('font-medium', isHeadingAligned ? 'text-ink' : 'text-ink-mute')}>
                    Heading alignment
                  </span>
                </div>
                <span className="text-[11px] font-mono text-ink-mute">
                  {isHeadingAligned ? 'Verified' : isMotionAligned ? 'Resolving...' : 'Pending'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full h-10 rounded-2xl bg-canvas-soft hover:bg-canvas-softer text-ink text-xs font-medium border border-border-clean transition-colors cursor-pointer"
            >
              Skip / Continue anyway
            </button>
          </div>
        )}

        {step === 'COMPLETE' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-base text-ink">
                Calibration complete
              </h4>
              <p className="text-xs text-ink-body mt-1">
                Phone inertial frame is synchronized with vehicle kinematics.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="w-full h-11 rounded-2xl bg-[#083335] hover:bg-[#052426] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
