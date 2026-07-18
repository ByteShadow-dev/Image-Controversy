import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import EditorLayout from '../layouts/EditorLayout';
import ImageCanvas from '../features/canvas/components/ImageCanvas';
import { useProjectStore, useUIStore } from '../store';
import { getTree } from '../services';
import { useQuery } from '@tanstack/react-query';

function EditorPage() {
  const { projectId } = useParams();
  const { setProject } = useProjectStore();
  const { setConnectionStatus } = useUIStore();

  const { data: treeData, isLoading, error } = useQuery({
    queryKey: ['tree', projectId],
    queryFn: () => getTree(projectId),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (projectId) {
      setProject(projectId, `Project ${projectId.slice(0, 8)}`);
    }
  }, [projectId, setProject]);

  useEffect(() => {
    if (error) {
      setConnectionStatus('disconnected');
    } else if (!isLoading) {
      setConnectionStatus('connected');
    }
  }, [error, isLoading, setConnectionStatus]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-adobe-darker">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-adobe-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-adobe-textMuted">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <EditorLayout>
      <ImageCanvas />
    </EditorLayout>
  );
}

export default EditorPage;
