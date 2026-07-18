import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Toolbar from '../features/toolbar/components/Toolbar';
import StatusBar from '../features/statusbar/components/StatusBar';
import VersionTree from '../features/tree/components/VersionTree';
import ChatPanel from '../features/chat/components/ChatPanel';
import Inspector from '../features/inspector/components/Inspector';
import { useUIStore } from '../store';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function EditorLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [showInspector, setShowInspector] = useState(true);

  return (
    <div className="h-full flex flex-col">
      {/* Top Toolbar */}
      <Toolbar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Version Tree */}
        <div className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed.left ? 'w-0' : 'w-72'} overflow-hidden`}>
          <div className="h-full border-r border-adobe-border bg-adobe-panel">
            <VersionTree />
          </div>
        </div>
        
        {/* Collapse Toggle - Left */}
        <button
          onClick={() => toggleSidebar('left')}
          className="flex items-center justify-center w-4 bg-adobe-darker hover:bg-adobe-border border-r border-adobe-border transition-colors"
          aria-label={sidebarCollapsed.left ? 'Expand left sidebar' : 'Collapse left sidebar'}
        >
          {sidebarCollapsed.left ? (
            <ChevronRight size={14} className="text-adobe-textMuted" />
          ) : (
            <ChevronLeft size={14} className="text-adobe-textMuted" />
          )}
        </button>
        
        {/* Center - Canvas */}
        <div className="flex-1 overflow-hidden bg-adobe-darker">
          <Outlet />
        </div>
        
        {/* Collapse Toggle - Right */}
        <button
          onClick={() => toggleSidebar('right')}
          className="flex items-center justify-center w-4 bg-adobe-darker hover:bg-adobe-border border-l border-adobe-border transition-colors"
          aria-label={sidebarCollapsed.right ? 'Expand right sidebar' : 'Collapse right sidebar'}
        >
          {sidebarCollapsed.right ? (
            <ChevronLeft size={14} className="text-adobe-textMuted" />
          ) : (
            <ChevronRight size={14} className="text-adobe-textMuted" />
          )}
        </button>
        
        {/* Right Sidebar - Chat & Inspector */}
        <div className={`flex-shrink-0 transition-all duration-300 ${sidebarCollapsed.right ? 'w-0' : 'w-96'} overflow-hidden`}>
          <div className="h-full flex flex-col border-l border-adobe-border bg-adobe-panel">
            <div className="flex-1 overflow-hidden">
              <ChatPanel />
            </div>
            {showInspector && (
              <div className="h-64 border-t border-adobe-border overflow-hidden">
                <Inspector onClose={() => setShowInspector(false)} />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
}

export default EditorLayout;
