import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  messages: [],
  isTyping: false,
  isLoading: false,
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  addMessages: (messages) => set((state) => ({
    messages: [...state.messages, ...messages],
  })),
  
  updateMessage: (messageId, updates) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ),
  })),
  
  setTyping: (isTyping) => set({ isTyping }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  clearMessages: () => set({ messages: [] }),
  
  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(msg => msg.id !== messageId),
  })),
}));
