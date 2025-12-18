import type { Tab, TabGroup, TabCategorizationResult } from '@/types';
import { llmService } from './LLMService';
import { apiClient } from './APIClient';
import { storageService } from './StorageService';

/**
 * TabService - Handles all tab-related operations
 */
export class TabService {
  async getAllTabs(): Promise<Tab[]> {
    const chromeTabs = await chrome.tabs.query({});
    return chromeTabs.map(tab => ({
      id: tab.id!,
      url: tab.url || '',
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
    }));
  }

  async getActiveTab(): Promise<Tab | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return null;

    return {
      id: tab.id,
      url: tab.url || '',
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
    };
  }

  async categorizeTabs(tabIds?: number[]): Promise<TabCategorizationResult[]> {
    // Get tabs to categorize
    let tabs: Tab[];
    if (tabIds && tabIds.length > 0) {
      const allTabs = await this.getAllTabs();
      tabs = allTabs.filter(tab => tabIds.includes(tab.id));
    } else {
      tabs = await this.getAllTabs();
    }

    // Check cache first
    const cacheKey = `tab-categories-${tabs.map(t => t.id).join('-')}`;
    const cached = await storageService.getCache<TabCategorizationResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Call backend API for categorization
    try {
      const results = await apiClient.post<TabCategorizationResult[]>(
        '/api/extension/categorize-tabs',
        { tabs }
      );

      // Cache results for 1 hour
      await storageService.setCache(cacheKey, results, 3600);

      return results;
    } catch (error) {
      console.error('Failed to categorize tabs via API, falling back to local:', error);
      
      // Fallback: local categorization
      return this.categorizeTabsLocally(tabs);
    }
  }

  private async categorizeTabsLocally(tabs: Tab[]): Promise<TabCategorizationResult[]> {
    const results: TabCategorizationResult[] = [];

    for (const tab of tabs) {
      try {
        const context = `URL: ${tab.url}\nTitle: ${tab.title}`;
        const category = await llmService.categorize(
          'Categorize this webpage into one of: Work, Personal, Research, Shopping, Social, Entertainment, Development, Other',
          context
        );

        results.push({
          tabId: tab.id,
          category: category || 'Other',
          groupId: category.toLowerCase().replace(/\s+/g, '-'),
          priority: 0,
        });
      } catch (error) {
        console.error(`Failed to categorize tab ${tab.id}:`, error);
        results.push({
          tabId: tab.id,
          category: 'Other',
          groupId: 'other',
          priority: 0,
        });
      }
    }

    return results;
  }

  async groupTabs(groupId: string, tabIds: number[]): Promise<void> {
    // Chrome doesn't have native tab grouping API in all versions
    // Store grouping in local storage for UI purposes
    const groups = await storageService.getCache<Record<string, number[]>>('tab-groups') || {};
    groups[groupId] = tabIds;
    await storageService.setCache('tab-groups', groups);
  }

  async focusTabGroup(groupId: string): Promise<void> {
    const groups = await storageService.getCache<Record<string, number[]>>('tab-groups') || {};
    const tabIds = groups[groupId] || [];

    if (tabIds.length > 0) {
      // Focus first tab in group
      await chrome.tabs.update(tabIds[0], { active: true });
    }
  }

  async getTabGroups(): Promise<TabGroup[]> {
    const groups = await storageService.getCache<Record<string, number[]>>('tab-groups') || {};
    const allTabs = await this.getAllTabs();
    
    return Object.entries(groups).map(([id, tabIds]) => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      tabs: allTabs.filter(tab => tabIds.includes(tab.id)),
    }));
  }

  async captureContext(): Promise<string> {
    const activeTab = await this.getActiveTab();
    if (!activeTab) return '';

    return `Current page: ${activeTab.title}\nURL: ${activeTab.url}`;
  }
}

export const tabService = new TabService();
