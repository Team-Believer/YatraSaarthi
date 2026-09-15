import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<LiveMap />} />
          <Route path="tunnel" element={<TunnelMode />} />
          <Route path="history" element={<History />} />
          <Route path="learning" element={<LearningInsights />} />
          <Route path="diagnostics" element={<SensorDiagnostics />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

