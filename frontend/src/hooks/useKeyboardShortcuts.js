import { useEffect } from 'react';
import { useViewportStore, useHistoryStore, useTreeStore, useUIStore } from '../store';
import { KEYBOARD_SHORTCUTS } from '../constants';

export const useKeyboardShortcuts = (actions) => {
  const { zoomIn, zoomOut, fitToScreen } = useViewportStore();
  const { canUndo, canRedo } = useHistoryStore();
  const { activeNodeId } = useTreeStore();
  const { addNotification } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && key === 'z') {
        e.preventDefault();
        if (canUndo() && actions.onUndo) {
          actions.onUndo();
        }
        return;
      }
      
      if (isCtrl && key === 'y') {
        e.preventDefault();
        if (canRedo() && actions.onRedo) {
          actions.onRedo();
        }
        return;
      }
      
      if (isCtrl && key === '=') {
        e.preventDefault();
        zoomIn();
        return;
      }
      
      if (isCtrl && key === '-') {
        e.preventDefault();
        zoomOut();
        return;
      }
      
      if (isCtrl && key === '0') {
        e.preventDefault();
        fitToScreen();
        return;
      }
      
      if (isCtrl && key === 's') {
        e.preventDefault();
        if (actions.onSave) {
          actions.onSave();
        }
        return;
      }
      
      if (isCtrl && key === 'b') {
        e.preventDefault();
        if (actions.onBranch && activeNodeId) {
          actions.onBranch(activeNodeId);
        }
        return;
      }
      
      if (key === 'delete' || key === 'backspace') {
        if (actions.onDelete && activeNodeId) {
          e.preventDefault();
          actions.onDelete(activeNodeId);
        }
        return;
      }
      
      if (key === 'escape') {
        if (actions.onEscape) {
          actions.onEscape();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, zoomIn, zoomOut, fitToScreen, canUndo, canRedo, activeNodeId, addNotification]);
};
