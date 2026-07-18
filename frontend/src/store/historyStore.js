import { create } from 'zustand';

const MAX_HISTORY = 50;

export const useHistoryStore = create((set, get) => ({
  undoStack: [],
  redoStack: [],
  
  pushUndo: (action) => set((state) => ({
    undoStack: [...state.undoStack.slice(-MAX_HISTORY + 1), action],
    redoStack: [],
  })),
  
  pushRedo: (action) => set((state) => ({
    redoStack: [...state.redoStack.slice(-MAX_HISTORY + 1), action],
  })),
  
  popUndo: () => set((state) => {
    if (state.undoStack.length === 0) return state;
    const newStack = [...state.undoStack];
    const action = newStack.pop();
    return {
      undoStack: newStack,
      redoStack: [...state.redoStack, action],
    };
  }),
  
  popRedo: () => set((state) => {
    if (state.redoStack.length === 0) return state;
    const newStack = [...state.redoStack];
    const action = newStack.pop();
    return {
      redoStack: newStack,
      undoStack: [...state.undoStack, action],
    };
  }),
  
  canUndo: () => get().undoStack.length > 0,
  
  canRedo: () => get().redoStack.length > 0,
  
  clearHistory: () => set({ 
    undoStack: [], 
    redoStack: [] 
  }),
}));
