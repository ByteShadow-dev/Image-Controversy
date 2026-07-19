import { useRef, useCallback } from 'react';
import { Tree } from 'react-arborist';
import { ChevronRight, ChevronDown, Folder, FileImage, MoreVertical } from 'lucide-react';
import { useTreeStore, useSelectionStore } from '../../../store';
import { formatDate } from '../../../utils';
import NodeContextMenu from './NodeContextMenu';

function VersionTree() {
  const treeRef = useRef(null);
  const { 
    tree, 
    activeNodeId, 
    expandedNodes, 
    setActiveNode, 
    toggleExpand,
    expandAll,
    collapseAll 
  } = useTreeStore();
  const { setSelectedNode } = useSelectionStore();

  const handleSelect = useCallback((node) => {
    if (node) {
      setActiveNode(node.data.id);
      setSelectedNode(node.data.id, node.data);
    }
  }, [setActiveNode, setSelectedNode]);

  const renderNode = useCallback(({ node, style, dragHandle }) => {
    const { data } = node;
    const isExpanded = expandedNodes.has(data.id);
    const isActive = activeNodeId === data.id;
    const hasChildren = data.children && data.children.length > 0;

    return (
      <div
        ref={dragHandle}
        style={style}
        className={`tree-node ${isActive ? 'tree-node-active' : ''}`}
        onClick={() => handleSelect(node)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(data.id);
          }}
          className="p-1 hover:bg-adobe-border rounded"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>
        
        {data.type === 'root' ? (
          <Folder size={14} className="text-adobe-accent" />
        ) : (
          <FileImage size={14} className="text-adobe-textMuted" />
        )}
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{data.name || 'Untitled'}</p>
          <p className="text-xs text-adobe-textMuted truncate">
            {formatDate(data.timestamp)}
          </p>
        </div>
        
        <NodeContextMenu nodeId={data.id} />
      </div>
    );
  }, [expandedNodes, activeNodeId, toggleExpand, handleSelect]);

  if (!tree) {
    return (
      <div className="h-full flex items-center justify-center text-adobe-textMuted">
        <div className="text-center p-4">
          <Folder size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No versions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tree Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-adobe-border">
        <h3 className="text-sm font-semibold text-adobe-text">Versions</h3>
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="p-1 hover:bg-adobe-border rounded"
            title="Expand All"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={collapseAll}
            className="p-1 hover:bg-adobe-border rounded"
            title="Collapse All"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      
      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-2">
        <Tree
          ref={treeRef}
          data={[tree]}
          width="100%"
          height={400}
          rowHeight={44}
          indent={20}
          onSelect={(nodes) => handleSelect(nodes?.[0])}
        >
          {renderNode}
        </Tree>
      </div>
    </div>
  );
}

export default VersionTree;
