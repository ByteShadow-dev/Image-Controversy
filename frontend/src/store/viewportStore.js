import { create } from 'zustand';
import { DEFAULT_ZOOM, ZOOM_LEVELS } from '../constants';

export const useViewportStore = create((set, get) => ({
  zoom: DEFAULT_ZOOM,
  pan: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  canvasSize: { width: 0, height: 0 },
  cursorPosition: { x: 0, y: 0 },
  showCompare: false,
  comparePosition: 50,
  
  setZoom: (zoom) => set({ 
    zoom: Math.max(ZOOM_LEVELS[0], Math.min(ZOOM_LEVELS[ZOOM_LEVELS.length - 1], zoom))
  }),
  
  zoomIn: () => set((state) => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= state.zoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    return { zoom: ZOOM_LEVELS[nextIndex] };
  }),
  
  zoomOut: () => set((state) => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z >= state.zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    return { zoom: ZOOM_LEVELS[prevIndex] };
  }),
  
  fitToScreen: () => set({ zoom: DEFAULT_ZOOM, pan: { x: 0, y: 0 } }),
  
  setPan: (pan) => set({ pan }),
  
  updatePan: (deltaX, deltaY) => set((state) => ({
    pan: {
      x: state.pan.x + deltaX,
      y: state.pan.y + deltaY,
    },
  })),
  
  startPanning: (x, y) => set({ 
    isPanning: true, 
    panStart: { x, y } 
  }),
  
  stopPanning: () => set({ isPanning: false }),
  
  setCanvasSize: (width, height) => set({ 
    canvasSize: { width, height } 
  }),
  
  setCursorPosition: (x, y) => set({ 
    cursorPosition: { x, y } 
  }),
  
  toggleCompare: () => set((state) => ({ 
    showCompare: !state.showCompare 
  })),
  
  setComparePosition: (position) => set({ 
    comparePosition: position 
  }),
}));
