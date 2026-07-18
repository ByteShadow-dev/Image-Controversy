import { create } from 'zustand';

export const useSelectionStore = create((set, get) => ({
  selectedNodeId: null,
  selectedNodeData: null,
  
  setSelectedNode: (nodeId, nodeData) => set({ 
    selectedNodeId: nodeId,
    selectedNodeData: nodeData,
  }),
  
  clearSelection: () => set({ 
    selectedNodeId: null,
    selectedNodeData: null,
  }),
  
  updateSelectedNodeData: (data) => set((state) => ({
    selectedNodeData: state.selectedNodeData 
      ? { ...state.selectedNodeData, ...data }
      : null,
  })),
}));
