import { create } from 'zustand';
import type { Tab, TabGroup } from '@/types';

interface TabStore {
  tabs: Tab[];
  groups: TabGroup[];
  loading: boolean;
  error: string | null;
  
  fetchTabs: () => Promise<void>;
  categorizeTabs: (tabIds?: number[]) => Promise<void>;
  focusGroup: (groupId: string) => Promise<void>;
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  groups: [],
  loading: false,
  error: null,

  fetchTabs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_TABS',
        payload: undefined,
      });

      if (response.success) {
        set({ tabs: response.data, loading: false });
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
        // Group tabs by category
        const grouped = new Map<string, Tab[]>();
        const tabs = get().tabs;

        response.data.forEach((result: any) => {
          const tab = tabs.find(t => t.id === result.tabId);
          if (tab) {
            const category = result.category;
            if (!grouped.has(category)) {
              grouped.set(category, []);
            }
            grouped.get(category)!.push({ ...tab, category, groupId: result.groupId });
          }
        });

        const groups: TabGroup[] = Array.from(grouped.entries()).map(([name, tabs]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          tabs,
        }));

        set({ groups, loading: false });
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
