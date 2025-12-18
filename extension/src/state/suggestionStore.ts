import { create } from 'zustand';
import type { Suggestion } from '@/types';

interface SuggestionStore {
  suggestions: Suggestion[];
  loading: boolean;
  error: string | null;
  
  fetchSuggestions: () => Promise<void>;
  executeSuggestion: (id: string) => Promise<void>;
  dismissSuggestion: (id: string) => Promise<void>;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  suggestions: [],
  loading: false,
  error: null,

  fetchSuggestions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SUGGESTIONS',
        payload: {},
      });

      if (response.success) {
        set({ suggestions: response.data, loading: false });
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  executeSuggestion: async (id: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'EXECUTE_SUGGESTION',
        payload: { suggestionId: id },
      });

      if (response.success) {
        set(state => ({
          suggestions: state.suggestions.filter(s => s.id !== id),
        }));
      }
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  dismissSuggestion: async (id: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'DISMISS_SUGGESTION',
        payload: { suggestionId: id },
      });

      set(state => ({
        suggestions: state.suggestions.filter(s => s.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
