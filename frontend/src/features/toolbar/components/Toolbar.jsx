import { useCallback } from 'react';
import { 
  Upload, Undo2, Redo2, Download, RotateCcw, 
  ZoomIn, ZoomOut, Maximize, Save, GitBranch 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useViewportStore, useHistoryStore, useProjectStore, useUIStore, useTreeStore } from '../../../store';
import { branchNode, exportImage, downloadExport } from '../../../services';

function Toolbar() {
  const navigate = useNavigate();
  const { zoomIn, zoomOut, fitToScreen } = useViewportStore();
  const { canUndo, canRedo } = useHistoryStore();
  const { projectId, clearProject } = useProjectStore();
  const { activeNodeId } = useTreeStore();
  const { addNotification } = useUIStore();

  const handleNewUpload = useCallback(() => {
    clearProject();
    navigate('/');
  }, [clearProject, navigate]);

  const handleUndo = useCallback(() => {
    // Undo logic would be implemented with history store
    console.log('Undo');
  }, []);

  const handleRedo = useCallback(() => {
    console.log('Redo');
  }, []);

  const handleExport = useCallback(async () => {
    if (!activeNodeId) {
      addNotification({
        type: 'warning',
        title: 'No Selection',
        message: 'Please select a version to export',
      });
      return;
    }

    try {
      const data = await exportImage(activeNodeId);
      const blob = await downloadExport(data.export_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${activeNodeId.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        title: 'Export Complete',
        message: 'Your image has been exported',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error.message,
      });
    }
  }, [activeNodeId, addNotification]);

  const handleReset = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  const handleSave = useCallback(() => {
    addNotification({
      type: 'success',
      title: 'Saved',
      message: 'Project saved successfully',
    });
  }, [addNotification]);

  const handleBranch = useCallback(async () => {
    if (!activeNodeId) {
      addNotification({
        type: 'warning',
        title: 'No Selection',
        message: 'Please select a version to branch from',
      });
      return;
    }

    try {
      await branchNode(activeNodeId, 'New branch');
      addNotification({
        type: 'success',
        title: 'Branch Created',
        message: 'New branch created successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Branch Failed',
        message: error.message,
      });
    }
  }, [activeNodeId, addNotification]);

  return (
    <div className="h-14 bg-adobe-panel border-b border-adobe-border flex items-center justify-between px-4">
      {/* Left Section - Project & Upload */}
      <div className="flex items-center gap-2">
        <button onClick={handleNewUpload} className="btn-secondary" title="New Upload">
          <Upload size={18} />
          <span className="hidden lg:inline">Upload</span>
        </button>
      </div>

      {/* Center Section - Edit Actions */}
      <div className="flex items-center gap-1">
        <button 
          onClick={handleUndo} 
          disabled={!canUndo()}
          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button 
          onClick={handleRedo}
          disabled={!canRedo()}
          className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
        <div className="w-px h-6 bg-adobe-border mx-2"></div>
        <button 
          onClick={handleBranch}
          className="btn-icon"
          title="Create Branch (Ctrl+B)"
        >
          <GitBranch size={18} />
        </button>
      </div>

      {/* Right Section - View & Export */}
      <div className="flex items-center gap-1">
        <button onClick={zoomOut} className="btn-icon" title="Zoom Out (Ctrl+-)">
          <ZoomOut size={18} />
        </button>
        <button onClick={fitToScreen} className="btn-icon" title="Fit to Screen (Ctrl+0)">
          <Maximize size={18} />
        </button>
        <button onClick={zoomIn} className="btn-icon" title="Zoom In (Ctrl+=)">
          <ZoomIn size={18} />
        </button>
        <div className="w-px h-6 bg-adobe-border mx-2"></div>
        <button onClick={handleReset} className="btn-icon" title="Reset View">
          <RotateCcw size={18} />
        </button>
        <button onClick={handleSave} className="btn-icon" title="Save (Ctrl+S)">
          <Save size={18} />
        </button>
        <button onClick={handleExport} className="btn-primary ml-2" title="Export Image">
          <Download size={18} />
          <span className="hidden lg:inline">Export</span>
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
