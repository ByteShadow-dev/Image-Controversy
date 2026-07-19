import { useCallback } from 'react';
import { Upload, Download, ZoomIn, ZoomOut, Maximize, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useViewportStore, useProjectStore, useUIStore, useTreeStore } from '../../../store';
import { deleteProject, getNode } from '../../../services';

function Toolbar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { zoomIn, zoomOut, fitToScreen } = useViewportStore();
  const { projectId, clearProject } = useProjectStore();
  const { activeNodeId } = useTreeStore();
  const { addNotification } = useUIStore();

  const handleNewUpload = useCallback(() => {
    clearProject();
    navigate('/');
  }, [clearProject, navigate]);

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
      const node = await getNode(activeNodeId);
      const filename = node.image_path?.split(/[\\/]/).pop();
      if (!filename) throw new Error('The selected version has no image file');

      const uploadsBase = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:8000/uploads';
      const response = await fetch(`${uploadsBase.replace(/\/$/, '')}/${encodeURIComponent(filename)}`);
      if (!response.ok) throw new Error('Unable to download the selected image');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
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

  const handleDeleteProject = useCallback(async () => {
    if (!projectId || !window.confirm('Delete this project and all of its versions? This cannot be undone.')) return;

    try {
      await deleteProject(projectId);
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearProject();
      navigate('/');
      addNotification({ type: 'success', title: 'Project Deleted', message: 'The project and its versions were deleted.' });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.response?.data?.detail || error.message,
      });
    }
  }, [projectId, clearProject, navigate, addNotification, queryClient]);

  return (
    <div className="h-14 bg-adobe-panel border-b border-adobe-border flex items-center justify-between px-4">
      {/* Left Section - Project & Upload */}
      <div className="flex items-center gap-2">
        <button onClick={handleNewUpload} className="btn-secondary" title="New Upload">
          <Upload size={18} />
          <span className="hidden lg:inline">Upload</span>
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
        <button
          onClick={handleDeleteProject}
          disabled={!projectId}
          className="btn-icon text-adobe-error disabled:opacity-40 disabled:cursor-not-allowed"
          title="Delete Project"
        >
          <Trash2 size={18} />
        </button>
        <button onClick={handleExport} className="btn-primary ml-2" title="Export Image">
          <Download size={18} />
          <span className="hidden lg:inline">Save</span>
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
