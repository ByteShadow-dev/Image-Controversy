import { create } from 'zustand';

export const useTreeStore = create((set, get) => ({
  tree: null,
  activeNodeId: null,
  expandedNodes: new Set(),
  selectedNodes: new Set(),
  
  setTree: (tree) => set({ tree }),
  
  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),
  
  toggleExpand: (nodeId) => set((state) => {
    const expanded = new Set(state.expandedNodes);
    if (expanded.has(nodeId)) {
      expanded.delete(nodeId);
    } else {
      expanded.add(nodeId);
    }
    return { expandedNodes: expanded };
  }),
  
  expandAll: () => set((state) => {
    const expanded = new Set();
    const collectIds = (nodes) => {
      nodes.forEach(node => {
        expanded.add(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };
    if (state.tree) {
      collectIds([state.tree]);
    }
    return { expandedNodes: expanded };
  }),
  
  collapseAll: () => set({ expandedNodes: new Set() }),
  
  addToSelection: (nodeId) => set((state) => {
    const selected = new Set(state.selectedNodes);
    selected.add(nodeId);
    return { selectedNodes: selected };
  }),
  
  removeFromSelection: (nodeId) => set((state) => {
    const selected = new Set(state.selectedNodes);
    selected.delete(nodeId);
    return { selectedNodes: selected };
  }),
  
  clearSelection: () => set({ selectedNodes: new Set() }),
  
  updateNode: (nodeId, updates) => set((state) => {
    const updateInTree = (node) => {
      if (node.id === nodeId) {
        return { ...node, ...updates };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(updateInTree),
        };
      }
      return node;
    };
    
    return {
      tree: state.tree ? updateInTree(state.tree) : null,
    };
  }),
  
  addNode: (parentId, newNode) => set((state) => {
    const addInTree = (node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...(node.children || []), newNode],
        };
      }
      if (node.children) {
        return {
          ...node,
          children: node.children.map(addInTree),
        };
      }
      return node;
    };
    
    return {
      tree: state.tree ? addInTree(state.tree) : null,
    };
  }),
  
  removeNode: (nodeId) => set((state) => {
    const removeFromTree = (node) => {
      if (node.children) {
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== nodeId)
            .map(removeFromTree),
        };
      }
      return node;
    };
    
    return {
      tree: state.tree ? removeFromTree(state.tree) : null,
      activeNodeId: state.activeNodeId === nodeId ? null : state.activeNodeId,
    };
  }),
}));
