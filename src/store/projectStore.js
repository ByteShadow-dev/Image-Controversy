import { create } from 'zustand';

export const useProjectStore = create((set, get) => ({
  projectId: null,
  projectName: '',
  hasImage: false,
  
  setProject: (projectId, projectName) => set({ 
    projectId, 
    projectName,
    hasImage: true 
  }),
  
  clearProject: () => set({ 
    projectId: null, 
    projectName: '',
    hasImage: false 
  }),
  
  updateProjectName: (name) => set({ projectName: name }),
}));
