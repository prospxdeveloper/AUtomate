import { create } from 'zustand';
import type { Tab, TabGroup } from '@/types';

interface TabStore {
  tabs: Tab[];
  groups: TabGroup[];
  loading: boolean;
  error: string | null;
  
  fetchTabs: () => Promise<void>;
  fetchTabGroups: () => Promise<void>;
  categorizeTabs: (tabIds?: number[]) => Promise<void>;
  uncategorizeTabs: (tabIds?: number[]) => Promise<void>;
  focusGroup: (groupId: string) => Promise<void>;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  groups: [],
  loading: false,
  error: null,

  fetchTabGroups: async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TAB_GROUPS',
        payload: undefined,
      });

      if (response.success) {
        set({ groups: response.data });
      }
    } catch {
      // ignore (keep best-effort)
    }
  },

  fetchTabs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TABS',
        payload: undefined,
      });

      if (response.success) {
        set({ tabs: response.data, loading: false });
        // Keep groups in sync with real Chrome groups (best-effort)
        await get().fetchTabGroups();
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  categorizeTabs: async (tabIds?: number[]) => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CATEGORIZE_TABS',
        payload: { tabIds },
      });

      if (response.success) {
        // After categorization, tab groups should exist physically; fetch them.
        await get().fetchTabGroups();
        // Refresh tab list too (titles/favicons can change during grouping)
        await get().fetchTabs();
        set({ loading: false });
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  uncategorizeTabs: async (tabIds?: number[]) => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UNCATEGORIZE_TABS',
        payload: { tabIds },
      });

      if (response.success) {
        // After ungrouping, groups should disappear physically; refresh.
        await get().fetchTabGroups();
        await get().fetchTabs();
        set({ loading: false });
      } else {
        set({ error: response.error, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  focusGroup: async (groupId: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'FOCUS_TAB_GROUP',
        payload: { groupId },
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
