import { Outlet } from 'react-router-dom';
import { useUIStore } from '../store';

function MainLayout() {
  const { connectionStatus } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-adobe-dark">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
      
      {/* Connection Status Indicator */}
      <div className={`fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
        connectionStatus === 'connected' 
          ? 'bg-adobe-success/20 text-adobe-success' 
          : connectionStatus === 'reconnecting'
          ? 'bg-adobe-warning/20 text-adobe-warning'
          : 'bg-adobe-error/20 text-adobe-error'
      }`}>
        {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
      </div>
    </div>
  );
}

export default MainLayout;
