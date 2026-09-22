import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { resolveHeading, type ResolvedHeading } from '../utils/navigation/headingResolver';

/**
 * Hook to consume the single unified resolved heading.
 * Follows strict priority:
 * 1. Live Navigation InEKF heading
 * 2. Real Device Compass / Magnetometer
 * 3. Moving GPS Course
 * 4. None ('—')
 */
export function useResolvedHeading(): ResolvedHeading {
  const isLive = useNavigationStore((s) => s.isLive);
  const liveHeading = useNavigationStore((s) => s.state.heading_deg);
  const packetsReceived = useNavigationStore((s) => s.state.packets_received);
  const fusedPosition = useNavigationStore((s) => s.fusedPosition);

  const compassHeading = useLocationStore((s) => s.compassHeading);
  const gpsHeading = useLocationStore((s) => s.gpsHeading);
  const locSpeed = useLocationStore((s) => s.speed);

  const navHeading = fusedPosition?.heading_deg ?? liveHeading;
  const hasNavPackets = packetsReceived > 0 || fusedPosition !== null;

  return resolveHeading({
    isLive,
    navigationHeading: navHeading,
    hasNavPackets,
    deviceHeading: compassHeading,
    gpsCourse: gpsHeading,
    speed: locSpeed,
  });
}
