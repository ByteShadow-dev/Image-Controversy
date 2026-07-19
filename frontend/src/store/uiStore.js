import { create } from 'zustand';
import { CONNECTION_STATUS } from '../constants';

export const useUIStore = create((set, get) => ({
  connectionStatus: CONNECTION_STATUS.CONNECTED,
  isLoading: false,
  error: null,
  notifications: [],
  sidebarCollapsed: {
    left: false,
    right: false,
  },
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { 
      id: Date.now(), 
      ...notification 
    }],
  })),
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id),
  })),
  
  collapseSidebar: (side, collapsed) => set((state) => ({
    sidebarCollapsed: {
      ...state.sidebarCollapsed,
      [side]: collapsed,
    },
  })),
  
  toggleSidebar: (side) => set((state) => ({
    sidebarCollapsed: {
      ...state.sidebarCollapsed,
      [side]: !state.sidebarCollapsed[side],
    },
  })),
}));
