import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Copy, Trash2, Edit2, GitBranch, Download, RotateCcw } from 'lucide-react';
import { useTreeStore, useUIStore } from '../../../store';
import { duplicateNode, deleteNode, renameNode, restoreNode, branchNode } from '../../../services';

function NodeContextMenu({ nodeId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  
  const { updateNode, removeNode, setActiveNode } = useTreeStore();
  const { addNotification } = useUIStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleRename = async () => {
    try {
      await renameNode(nodeId, editName);
      updateNode(nodeId, { name: editName });
      setIsEditing(false);
      addNotification({
        type: 'success',
        title: 'Renamed',
        message: 'Node renamed successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Rename Failed',
        message: error.message,
      });
    }
  };

  const handleDuplicate = async () => {
    try {
      const data = await duplicateNode(nodeId);
      addNotification({
        type: 'success',
        title: 'Duplicated',
        message: 'Node duplicated successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Duplicate Failed',
        message: error.message,
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this version?')) return;
    
    try {
      await deleteNode(nodeId);
      removeNode(nodeId);
      addNotification({
        type: 'success',
        title: 'Deleted',
        message: 'Node deleted successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: error.message,
      });
    }
  };

  const handleRestore = async () => {
    try {
      await restoreNode(nodeId);
      setActiveNode(nodeId);
      addNotification({
        type: 'success',
        title: 'Restored',
        message: 'Version restored successfully',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Restore Failed',
        message: error.message,
      });
    }
  };

  const handleBranch = async () => {
    try {
      await branchNode(nodeId, 'New branch');
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
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 hover:bg-adobe-border rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <MoreVertical size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-adobe-panel border border-adobe-border rounded-md shadow-lg z-50 py-1">
          {isEditing ? (
            <div className="px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="w-full input-field text-sm"
                placeholder="Enter name..."
              />
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditName('Untitled');
                  setIsEditing(true);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-adobe-border flex items-center gap-2"
              >
                <Edit2 size={14} />
                <span>Rename</span>
              </button>
              <button
                onClick={handleDuplicate}
                className="w-full px-3 py-2 text-left text-sm hover:bg-adobe-border flex items-center gap-2"
              >
                <Copy size={14} />
                <span>Duplicate</span>
              </button>
              <button
                onClick={handleBranch}
                className="w-full px-3 py-2 text-left text-sm hover:bg-adobe-border flex items-center gap-2"
              >
                <GitBranch size={14} />
                <span>Create Branch</span>
              </button>
              <button
                onClick={handleRestore}
                className="w-full px-3 py-2 text-left text-sm hover:bg-adobe-border flex items-center gap-2"
              >
                <RotateCcw size={14} />
                <span>Restore Version</span>
              </button>
              <div className="border-t border-adobe-border my-1"></div>
              <button
                onClick={handleDelete}
                className="w-full px-3 py-2 text-left text-sm hover:bg-adobe-error/20 text-adobe-error flex items-center gap-2"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default NodeContextMenu;
