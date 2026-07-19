import { Outlet } from 'react-router-dom';
import { useUIStore } from '../store';

function MainLayout() {
  const { connectionStatus } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-adobe-dark">
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
