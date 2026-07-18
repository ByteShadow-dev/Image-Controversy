import { Wifi, WifiOff, MousePointer2, Image as ImageIcon, GitBranch } from 'lucide-react';
import { useViewportStore, useTreeStore, useUIStore } from '../../../store';
import { getZoomPercentage } from '../../../utils';
import { CONNECTION_STATUS } from '../../../constants';

function StatusBar() {
  const { zoom, canvasSize, cursorPosition } = useViewportStore();
  const { activeNodeId } = useTreeStore();
  const { connectionStatus } = useUIStore();

  return (
    <div className="h-7 bg-adobe-panel border-t border-adobe-border flex items-center justify-between px-3 text-xs">
      {/* Left Section - Connection & Zoom */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-1.5">
          {connectionStatus === CONNECTION_STATUS.CONNECTED ? (
            <Wifi size={12} className="text-adobe-success" />
          ) : connectionStatus === CONNECTION_STATUS.RECONNECTING ? (
            <Wifi size={12} className="text-adobe-warning animate-pulse" />
          ) : (
            <WifiOff size={12} className="text-adobe-error" />
          )}
          <span className={`text-adobe-textMuted ${
            connectionStatus === CONNECTION_STATUS.CONNECTED ? 'text-adobe-success' : ''
          }`}>
            {connectionStatus === CONNECTION_STATUS.CONNECTED 
              ? 'Connected' 
              : connectionStatus === CONNECTION_STATUS.RECONNECTING 
                ? 'Reconnecting...' 
                : 'Disconnected'}
          </span>
        </div>

        {/* Zoom Level */}
        <div className="flex items-center gap-1.5">
          <span className="text-adobe-textMuted">Zoom:</span>
          <span className="text-adobe-text font-mono">{getZoomPercentage(zoom)}</span>
        </div>
      </div>

      {/* Center Section - Canvas Info */}
      <div className="flex items-center gap-4">
        {/* Cursor Position */}
        <div className="flex items-center gap-1.5">
          <MousePointer2 size={12} className="text-adobe-textMuted" />
          <span className="text-adobe-textMuted">X:</span>
          <span className="text-adobe-text font-mono w-8 text-right">{cursorPosition.x}</span>
          <span className="text-adobe-textMuted">Y:</span>
          <span className="text-adobe-text font-mono w-8 text-right">{cursorPosition.y}</span>
        </div>

        {/* Canvas Size */}
        <div className="flex items-center gap-1.5">
          <ImageIcon size={12} className="text-adobe-textMuted" />
          <span className="text-adobe-textMuted">Canvas:</span>
          <span className="text-adobe-text font-mono">
            {canvasSize.width > 0 && canvasSize.height > 0 
              ? `${Math.round(canvasSize.width)} × ${Math.round(canvasSize.height)}`
              : '-- × --'}
          </span>
        </div>
      </div>

      {/* Right Section - Node Info */}
      <div className="flex items-center gap-4">
        {/* Active Node */}
        {activeNodeId && (
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} className="text-adobe-textMuted" />
            <span className="text-adobe-textMuted">Active:</span>
            <span className="text-adobe-text font-mono">{activeNodeId.slice(0, 8)}...</span>
          </div>
        )}

        {/* Version Count Placeholder */}
        <div className="flex items-center gap-1.5">
          <span className="text-adobe-textMuted">Version</span>
          <span className="text-adobe-text font-mono">1.0</span>
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
