import { useState, useEffect } from 'react';
import { demoOutageService, type DemoOutageState } from '../services/navigation/demoOutageService';

export function useDemoOutage(): DemoOutageState & {
  startOutage: () => void;
  restoreGnss: () => void;
  toggleOutage: () => boolean;
} {
  const [state, setState] = useState<DemoOutageState>(() => demoOutageService.getState());

  useEffect(() => {
    return demoOutageService.subscribe((updated) => {
      setState(updated);
    });
  }, []);

  return {
    ...state,
    startOutage: () => demoOutageService.startOutage(),
    restoreGnss: () => demoOutageService.restoreGnss(),
    toggleOutage: () => demoOutageService.toggleOutage(),
  };
}
