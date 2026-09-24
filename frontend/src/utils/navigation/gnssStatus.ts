/**
 * YatraSaarthi - GNSS / Dead Reckoning Navigation Mode Status Mapping
 * 
 * Maps actual backend and local navigation telemetry to standardized product states:
 * 1. GNSS_ACQUIRING: "GPS · Acquiring" / "GNSS · Acquiring" (calm sky blue)
 * 2. GNSS_STRONG: "GPS · Strong" (calm green)
 * 3. GNSS_FUSING: "GNSS + IMU · Fusing" (Evergreen/blue neutral fusion state)
 * 4. DEAD_RECKONING: "Dead Reckoning · No GPS" (amber status during real outage)
 * 5. GNSS_REACQUISITION: "GPS · Reacquiring" (sky blue transition)
 * 6. DEGRADED: "Navigation · Degraded" (neutral warning state)
 * 
 * Values are mapped STRICTLY from real session telemetry.
 */

export type GnssNavState =
  | 'GNSS_ACQUIRING'
  | 'GNSS_STRONG'
  | 'GNSS_FUSING'
  | 'DEAD_RECKONING'
  | 'GNSS_REACQUISITION'
  | 'DEGRADED';

export interface GnssNavStatusDescriptor {
  state: GnssNavState;
  title: string;
  subtitle: string;
  dotColor: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  isDr: boolean;
  isOutage: boolean;
  isReacquiring: boolean;
  isAcquiring: boolean;
  outageDurationSeconds: number;
}

export interface NavigationTelemetryInput {
  isLive: boolean;
  navigationMode?: string | null;
  gnssAvailable?: boolean;
  gnssQuality?: string | null;
  gnssOutageDuration?: number;
  environmentState?: string | null;
  imuAvailable?: boolean;
  isDemoOutageActive?: boolean;
  demoOutageSeconds?: number;
  hasHadFix?: boolean;
  permission?: 'prompt' | 'granted' | 'denied' | string | null;
  availability?: string | null;
}

export function formatOutageDuration(seconds: number): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '0s';
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function deriveGnssNavStatus(input: NavigationTelemetryInput): GnssNavStatusDescriptor {
  const {
    isLive,
    navigationMode = 'STANDBY',
    gnssAvailable = false,
    gnssQuality = 'ACQUIRING',
    gnssOutageDuration = 0,
    environmentState = 'NORMAL_ROAD',
    imuAvailable = false,
    isDemoOutageActive = false,
    demoOutageSeconds = 0,
    hasHadFix = false,
    permission,
  } = input;

  const modeUpper = (navigationMode || '').toUpperCase();
  const qualityUpper = (gnssQuality || '').toUpperCase();
  const envUpper = (environmentState || '').toUpperCase();

  // Demo outage triggers Dead Reckoning ONLY when navigation is active, per Rule 10
  const isDemoOutageLive = isDemoOutageActive && (isLive || gnssAvailable || hasHadFix);
  const effectiveOutageDuration = isDemoOutageLive
    ? Math.max(demoOutageSeconds, gnssOutageDuration)
    : gnssOutageDuration;

  // 1. DEAD RECKONING / GNSS LOST:
  // Must ONLY occur when:
  // (a) Demo outage is live, OR
  // (b) Navigation session is active (isLive = true) AND
  //     (a valid fix existed previously [hasHadFix] OR backend explicitly reports DEAD_RECKONING/INEKF/TUNNEL/outage duration) AND
  //     (!gnssAvailable || effectiveOutageDuration > 0.5 || modeUpper.includes('DEAD_RECKONING') || modeUpper.includes('LOST') || envUpper === 'TUNNEL')
  const isDr =
    isDemoOutageLive ||
    (isLive &&
      (modeUpper.includes('DEAD_RECKONING') ||
        modeUpper.includes('LOST') ||
        modeUpper.includes('INEKF') ||
        modeUpper.includes('INERTIAL') ||
        envUpper === 'TUNNEL' ||
        (effectiveOutageDuration > 0.5 && (hasHadFix || qualityUpper === 'LOST')) ||
        (!gnssAvailable && hasHadFix)));

  if (isDr) {
    const outageText = effectiveOutageDuration > 0
      ? `${formatOutageDuration(effectiveOutageDuration)} outage`
      : 'IMU + AI active';

    return {
      state: 'DEAD_RECKONING',
      title: 'Dead Reckoning · No GPS',
      subtitle: outageText,
      dotColor: 'bg-amber-500',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      textColor: 'text-amber-800 dark:text-amber-300',
      isDr: true,
      isOutage: true,
      isReacquiring: false,
      isAcquiring: false,
      outageDurationSeconds: effectiveOutageDuration,
    };
  }

  // 2. GNSS REACQUISITION (Recovering fix, validating satellites)
  const isReacquiring =
    (isLive || isDemoOutageActive) &&
    (modeUpper.includes('REACQUISITION') ||
      modeUpper.includes('RECOVERY') ||
      qualityUpper === 'RECOVERING');

  if (isReacquiring) {
    return {
      state: 'GNSS_REACQUISITION',
      title: 'GPS · Reacquiring',
      subtitle: 'Validating satellite fix',
      dotColor: 'bg-sky-500',
      badgeBg: 'bg-sky-500/10',
      badgeBorder: 'border-sky-500/30',
      textColor: 'text-sky-800 dark:text-sky-300',
      isDr: false,
      isOutage: false,
      isReacquiring: true,
      isAcquiring: false,
      outageDurationSeconds: 0,
    };
  }

  // 3. PERMISSION & ACQUISITION (when GNSS is not yet available)
  if (!gnssAvailable && !isLive) {
    if (permission === 'denied') {
      return {
        state: 'GNSS_ACQUIRING',
        title: 'Location permission required',
        subtitle: 'Enable location in settings',
        dotColor: 'bg-rose-500',
        badgeBg: 'bg-rose-500/10',
        badgeBorder: 'border-rose-500/30',
        textColor: 'text-rose-700 dark:text-rose-300',
        isDr: false,
        isOutage: false,
        isReacquiring: false,
        isAcquiring: true,
        outageDurationSeconds: 0,
      };
    }
    if (permission === 'prompt') {
      return {
        state: 'GNSS_ACQUIRING',
        title: 'GPS · Waiting for permission',
        subtitle: 'Grant location permission',
        dotColor: 'bg-sky-500',
        badgeBg: 'bg-sky-500/10',
        badgeBorder: 'border-sky-500/30',
        textColor: 'text-sky-700 dark:text-sky-300',
        isDr: false,
        isOutage: false,
        isReacquiring: false,
        isAcquiring: true,
        outageDurationSeconds: 0,
      };
    }
    // Initial state before first valid fix
    return {
      state: 'GNSS_ACQUIRING',
      title: 'GPS · Acquiring',
      subtitle: 'Searching for satellites',
      dotColor: 'bg-sky-500',
      badgeBg: 'bg-sky-500/10',
      badgeBorder: 'border-sky-500/30',
      textColor: 'text-sky-700 dark:text-sky-300',
      isDr: false,
      isOutage: false,
      isReacquiring: false,
      isAcquiring: true,
      outageDurationSeconds: 0,
    };
  }

  // Handle active navigation session before first fix is acquired
  if (!gnssAvailable && isLive && !hasHadFix && !modeUpper.includes('DEAD_RECKONING')) {
    return {
      state: 'GNSS_ACQUIRING',
      title: 'GPS · Acquiring',
      subtitle: 'Searching for satellites',
      dotColor: 'bg-sky-500',
      badgeBg: 'bg-sky-500/10',
      badgeBorder: 'border-sky-500/30',
      textColor: 'text-sky-700 dark:text-sky-300',
      isDr: false,
      isOutage: false,
      isReacquiring: false,
      isAcquiring: true,
      outageDurationSeconds: 0,
    };
  }

  // 4. DEGRADED (Multipath, poor satellite geometry, urban canyon)
  const isDegraded =
    modeUpper.includes('DEGRADING') ||
    qualityUpper === 'POOR' ||
    qualityUpper === 'FAIR' ||
    qualityUpper === 'DEGRADED' ||
    envUpper === 'URBAN_CANYON';

  if (isDegraded && isLive) {
    return {
      state: 'DEGRADED',
      title: 'Navigation · Degraded',
      subtitle: 'Inertial aiding active',
      dotColor: 'bg-amber-400',
      badgeBg: 'bg-amber-400/10',
      badgeBorder: 'border-amber-400/30',
      textColor: 'text-amber-700 dark:text-amber-200',
      isDr: false,
      isOutage: false,
      isReacquiring: false,
      isAcquiring: false,
      outageDurationSeconds: 0,
    };
  }

  // 5. GNSS FUSING (Both GNSS and IMU actively fusing nominally)
  const isFusing =
    imuAvailable &&
    gnssAvailable &&
    (modeUpper.includes('AIDED') || modeUpper.includes('FUSION') || qualityUpper === 'GOOD' || !isLive);

  if (isFusing) {
    return {
      state: 'GNSS_FUSING',
      title: 'GNSS + IMU · Fusing',
      subtitle: isLive ? 'Nominal sensor fusion' : 'GNSS + IMU ready',
      dotColor: 'bg-[#083335]',
      badgeBg: 'bg-[#083335]/10',
      badgeBorder: 'border-[#083335]/25',
      textColor: 'text-[#083335]',
      isDr: false,
      isOutage: false,
      isReacquiring: false,
      isAcquiring: false,
      outageDurationSeconds: 0,
    };
  }

  // 6. GNSS STRONG (Clean satellite lock)
  return {
    state: 'GNSS_STRONG',
    title: 'GPS · Strong',
    subtitle: isLive ? 'High precision lock' : 'Navigation ready',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/25',
    textColor: 'text-emerald-800 dark:text-emerald-300',
    isDr: false,
    isOutage: false,
    isReacquiring: false,
    isAcquiring: false,
    outageDurationSeconds: 0,
  };
}
