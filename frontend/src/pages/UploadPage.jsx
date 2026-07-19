import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderOpen, Calendar, ArrowRight } from 'lucide-react';
import UploadPanel from '../features/upload/components/UploadPanel';
import { apiClient } from '../services/api';
import { formatDate } from '../utils';

function UploadPage() {
  const { data: trees, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiClient.get('/tree/');
      return response.data;
    },
  });

  return (
    <div className="h-full overflow-y-auto bg-adobe-darker p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-adobe-text mb-3 tracking-tight">
            AI Image Editor
          </h1>
          <p className="text-adobe-textMuted max-w-lg mx-auto">
            Upload an image to start a new visual history tree, or select an existing session below.
          </p>
        </div>

        {/* Upload Panel */}
        <div className="max-w-2xl mx-auto">
          <UploadPanel />
        </div>

        {/* Existing Projects / Trees List */}
        <div className="space-y-6">
          <div className="border-b border-adobe-border pb-4 flex items-center gap-2">
            <FolderOpen className="text-adobe-accent" size={20} />
            <h2 className="text-xl font-semibold text-adobe-text">Your Saved Projects ({trees?.length || 0})</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-adobe-accent border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : trees && trees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trees.map((tree) => {
                const treeId = tree.id || tree._id;
                return (
                  <Link
                    key={treeId}
                    to={`/editor/${treeId}`}
                    className="group bg-adobe-panel border border-adobe-border hover:border-adobe-accent rounded-lg p-5 transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div>
                      <h3 className="font-semibold text-adobe-text text-lg group-hover:text-adobe-accent transition-colors truncate">
                        {tree.title || 'Untitled Project'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-adobe-textMuted text-xs mt-3">
                        <Calendar size={13} />
                        <span>Created: {formatDate(tree.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 text-adobe-textMuted group-hover:text-adobe-accent text-sm font-medium pt-2 border-t border-adobe-border/50">
                      <span>Open Workspace</span>
                      <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-12 bg-adobe-panel rounded-lg border border-adobe-border border-dashed">
              <p className="text-adobe-textMuted">No projects saved yet. Upload an image above to start your first session!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
