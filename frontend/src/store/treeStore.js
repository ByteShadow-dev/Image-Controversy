import { create } from 'zustand';

function buildHierarchy(nodes, rootNodeId) {
  if (!nodes || nodes.length === 0) return null;

  const nodeId = (node) => String(node.id || node._id);
  const byId = new Map(nodes.map((node) => [nodeId(node), node]));
  const childrenByParent = new Map();

  nodes.forEach((node) => {
    if (!node.parent_id) return;
    const parentId = String(node.parent_id);
    const children = childrenByParent.get(parentId) || [];
    children.push(node);
    childrenByParent.set(parentId, children);
  });

  const rootNode = byId.get(String(rootNodeId))
    || nodes.find((node) => !node.parent_id)
    || nodes[0];

  const build = (node, ancestors = new Set()) => {
    const id = nodeId(node);
    // Invalid legacy data should not be able to make the UI recurse forever.
    if (ancestors.has(id)) return null;
    const nextAncestors = new Set(ancestors).add(id);
    const children = (childrenByParent.get(id) || [])
      .map((child) => build(child, nextAncestors))
      .filter(Boolean);

    return {
      id,
      name: node.edit?.operation || "Original",
      type: node.parent_id ? "edit" : "root",
      image_path: node.image_path,
      status: node.status,
      nodeData: node,
      children: children
    };
  };

  return build(rootNode);
}

export const useTreeStore = create((set) => ({
  tree: null,
  rawNodes: [],
  activeNodeId: null,
  expandedNodes: new Set(),
  selectedNodes: new Set(),
  
  setTree: (treeData) => {
    if (!treeData) return;
    const { tree, nodes } = treeData;
    if (!tree || !nodes) {
      set({ tree: treeData });
      return;
    }
    const rootNodeId = tree.root_node_id;
    const hierarchy = buildHierarchy(nodes, rootNodeId);
    set({ tree: hierarchy, rawNodes: nodes });
  },
  
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
    const normalizedNode = { ...newNode, id: String(newNode.id || newNode._id) };
    const addInTree = (node) => {
      if (node.id === String(parentId)) {
        return {
          ...node,
          children: [...(node.children || []), normalizedNode],
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
      rawNodes: [...state.rawNodes, normalizedNode.nodeData || normalizedNode],
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
