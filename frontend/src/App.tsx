import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SplashScreen from './pages/SplashScreen';
import OnboardingPage from './pages/OnboardingPage';
import LandingPage from './pages/LandingPage';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import TunnelMode from './pages/TunnelMode';
import SensorDiagnostics from './pages/SensorDiagnostics';
import History from './pages/History';
import LearningInsights from './pages/LearningInsights';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import NavigationMemoryPage from './pages/NavigationMemoryPage';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { PwaUpdatePrompt } from './components/pwa/PwaUpdatePrompt';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { setupChunkLoadRecovery } from './utils/chunkLoadRecovery';
import { offlineNavigationController } from './services/offline/offlineNavigationController';

// Initialize global chunk recovery listener early
setupChunkLoadRecovery();

function App() {
  useEffect(() => {
    // Initialize offline navigation controller at application launch
    offlineNavigationController.init();
  }, []);

  return (
    <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="YatraSaarthi encountered an unexpected issue.">
      <Router>
        <PwaUpdatePrompt />
        <PwaInstallPrompt />
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="map" element={<LiveMap />} />
            <Route path="tunnel" element={<TunnelMode />} />
            <Route path="history" element={<History />} />
            <Route path="learning" element={<LearningInsights />} />
            <Route path="diagnostics" element={<SensorDiagnostics />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="memory" element={<NavigationMemoryPage />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
