import { create } from 'zustand';
import type { Memory } from '@/types';

interface MemoryStore {
  memories: Memory[];
  searchResults: Memory[];
  loading: boolean;
  error: string | null;
  
  searchMemories: (query: string) => Promise<void>;
  saveHighlight: (text: string, url: string, title: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
}

export const useMemoryStore = create<MemoryStore>((set) => ({
  memories: [],
  searchResults: [],
  loading: false,
  error: null,

  searchMemories: async (query: string) => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_MEMORIES',
        payload: { query, limit: 20 },
      });

      if (response.success) {
        set({ searchResults: response.data, loading: false });
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  saveHighlight: async (text: string, url: string, title: string) => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_HIGHLIGHT',
        payload: { text, url, title },
      });

      if (response.success) {
        set({ loading: false });
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteMemory: async (id: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_MEMORY',
        payload: { id },
      });

      if (response.success) {
        set(state => ({
          searchResults: state.searchResults.filter(m => m.id !== id),
        }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
