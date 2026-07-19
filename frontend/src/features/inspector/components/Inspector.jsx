import { X } from 'lucide-react';
import { useSelectionStore, useTreeStore } from '../../../store';
import { formatDate } from '../../../utils';

function Inspector({ onClose }) {
  const { selectedNodeData, selectedNodeId, clearSelection } = useSelectionStore();
  const { activeNodeId } = useTreeStore();

  if (!selectedNodeData) {
    return (
      <div className="h-full flex items-center justify-center text-adobe-textMuted">
        <div className="text-center p-4">
          <p className="text-sm">No node selected</p>
          <p className="text-xs mt-1">Select a version to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-adobe-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-adobe-border">
        <h3 className="text-sm font-semibold text-adobe-text">Inspector</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-adobe-border rounded transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Thumbnail Preview */}
        {selectedNodeData.thumbnail_url && (
          <div className="aspect-video bg-adobe-dark rounded-lg overflow-hidden border border-adobe-border">
            <img
              src={selectedNodeData.thumbnail_url}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Node Info */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-adobe-textMuted block mb-1">Name</label>
            <p className="text-sm text-adobe-text font-medium">
              {selectedNodeData.name || 'Untitled'}
            </p>
          </div>

          <div>
            <label className="text-xs text-adobe-textMuted block mb-1">Node ID</label>
            <p className="text-xs text-adobe-text font-mono bg-adobe-dark px-2 py-1 rounded">
              {selectedNodeData.id}
            </p>
          </div>

          {selectedNodeData.parent_id && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Parent ID</label>
              <p className="text-xs text-adobe-text font-mono bg-adobe-dark px-2 py-1 rounded">
                {selectedNodeData.parent_id}
              </p>
            </div>
          )}

          <div>
            <label className="text-xs text-adobe-textMuted block mb-1">Type</label>
            <span className="inline-block px-2 py-1 bg-adobe-accent/20 text-adobe-accent text-xs rounded">
              {selectedNodeData.type || 'edit'}
            </span>
          </div>

          <div>
            <label className="text-xs text-adobe-textMuted block mb-1">Timestamp</label>
            <p className="text-sm text-adobe-text">
              {formatDate(selectedNodeData.timestamp)}
            </p>
          </div>

          {selectedNodeData.prompt && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Prompt</label>
              <p className="text-sm text-adobe-text bg-adobe-dark px-3 py-2 rounded border border-adobe-border">
                {selectedNodeData.prompt}
              </p>
            </div>
          )}

          {selectedNodeData.summary && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Summary</label>
              <p className="text-sm text-adobe-text bg-adobe-dark px-3 py-2 rounded border border-adobe-border">
                {selectedNodeData.summary}
              </p>
            </div>
          )}

          {selectedNodeData.operation && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Operation</label>
              <p className="text-sm text-adobe-text">
                {selectedNodeData.operation}
              </p>
            </div>
          )}

          {selectedNodeData.explanation && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Explanation</label>
              <p className="text-sm text-adobe-text bg-adobe-dark px-3 py-2 rounded border border-adobe-border">
                {selectedNodeData.explanation}
              </p>
            </div>
          )}

          {selectedNodeData.children && selectedNodeData.children.length > 0 && (
            <div>
              <label className="text-xs text-adobe-textMuted block mb-1">Children</label>
              <p className="text-sm text-adobe-text">
                {selectedNodeData.children.length} version{selectedNodeData.children.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Active Indicator */}
        {selectedNodeId === activeNodeId && (
          <div className="mt-4 p-3 bg-adobe-accent/10 border border-adobe-accent rounded-md">
            <p className="text-xs text-adobe-accent font-medium">
              This is the active version
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inspector;
