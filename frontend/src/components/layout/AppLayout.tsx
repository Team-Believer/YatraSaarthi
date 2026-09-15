import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  
  return (
    <div className="flex h-screen bg-brand-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-brand-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

