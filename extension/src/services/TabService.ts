import type { Tab, TabGroup, TabCategorizationResult } from '@/types';
import { apiClient } from './APIClient';
import { storageService } from './StorageService';

/**
 * TabService - Handles all tab-related operations
 */
export class TabService {
  async getAllTabs(query: chrome.tabs.QueryInfo = {}): Promise<Tab[]> {
    const chromeTabs = await chrome.tabs.query(query);
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
      const allTabs = await this.getAllTabs({ currentWindow: true });
      tabs = allTabs.filter(tab => tabIds.includes(tab.id));
    } else {
      // Physically grouping across multiple windows is surprising; keep this scoped.
      tabs = await this.getAllTabs({ currentWindow: true });
    }

    // Check cache first
    const cacheKey = `tab-categories-${tabs.map(t => t.id).join('-')}`;
    const cached = await storageService.getCache<TabCategorizationResult[]>(cacheKey);
    if (cached) {
      // Apply groups even when the categorization is cached.
      await this.applyChromeTabGroups(cached);
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

      await this.applyChromeTabGroups(results);

      return results;
    } catch (error) {
      console.error('Failed to categorize tabs via API, falling back to local:', error);
      
      // Fallback: local categorization
      const results = await this.categorizeTabsLocally(tabs);
      await this.applyChromeTabGroups(results);
      return results;
    }
  }

  private async categorizeTabsLocally(tabs: Tab[]): Promise<TabCategorizationResult[]> {
    return tabs.map((tab) => {
      const category = this.categorizeTabHeuristic(tab);
      const groupId = category.toLowerCase().replace(/\s+/g, '-');
      return {
        tabId: tab.id,
        category,
        groupId,
        priority: 0,
      };
    });
  }

  private categorizeTabHeuristic(tab: Tab): string {
    const url = (tab.url || '').toLowerCase();
    const title = (tab.title || '').toLowerCase();
    const hay = `${url} ${title}`;

    const hasAny = (needles: string[]) => needles.some(n => hay.includes(n));

    if (hasAny(['github.com', 'gitlab.com', 'bitbucket', 'jira', 'linear.app', 'notion.so', 'confluence', 'docs.google.com', 'drive.google.com', 'calendar.google.com', 'slack.com'])) {
      return 'Work';
    }

    if (hasAny(['stackoverflow.com', 'developer.mozilla.org', 'mdn', 'docs.', 'documentation', 'api ', 'sdk', 'npmjs.com', 'pypi.org', 'rust-lang.org', 'go.dev', 'nextjs.org', 'react.dev'])) {
      return 'Development';
    }

    if (hasAny(['arxiv.org', 'scholar.google', 'wikipedia.org', 'research', 'paper', 'journal', 'dataset'])) {
      return 'Research';
    }

    if (hasAny(['amazon.', 'flipkart', 'ebay.', 'walmart', 'aliexpress', 'shop', 'checkout', 'cart', 'product'])) {
      return 'Shopping';
    }

    if (hasAny(['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'discord.com', 'threads.net'])) {
      return 'Social';
    }

    if (hasAny(['youtube.com', 'netflix.com', 'primevideo', 'spotify.com', 'music', 'movie', 'stream', 'twitch.tv'])) {
      return 'Entertainment';
    }

    if (hasAny(['bank', 'invoice', 'receipt', 'tax', 'payment', 'order', 'account', 'profile', 'settings'])) {
      return 'Personal';
    }

    return 'Other';
  }

  private isTabGroupsSupported(): boolean {
    return Boolean(
      chrome?.tabs?.group &&
        chrome?.tabGroups &&
        typeof chrome.tabs.group === 'function' &&
        typeof chrome.tabGroups.update === 'function'
    );
  }

  private tabGroupColorForCategory(category: string): chrome.tabGroups.ColorEnum {
    const colors: chrome.tabGroups.ColorEnum[] = [
      'blue',
      'red',
      'yellow',
      'green',
      'pink',
      'purple',
      'cyan',
      'orange',
      'grey',
    ];

    // Deterministic hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
    }
    return colors[hash % colors.length];
  }

  private async applyChromeTabGroups(results: TabCategorizationResult[]): Promise<void> {
    if (!this.isTabGroupsSupported()) {
      // Keep UI grouping fallback for environments without Tab Groups.
      const groups = (await storageService.getCache<Record<string, number[]>>('tab-groups')) || {};
      for (const r of results) {
        if (!groups[r.groupId]) groups[r.groupId] = [];
        if (!groups[r.groupId].includes(r.tabId)) groups[r.groupId].push(r.tabId);
      }
      await storageService.setCache('tab-groups', groups);
      return;
    }

    // Group in the current window only.
    const currentWindowTabs = await chrome.tabs.query({ currentWindow: true });
    const currentWindowTabIds = new Set(currentWindowTabs.map(t => t.id).filter((id): id is number => typeof id === 'number'));
    const validResults = results.filter(r => currentWindowTabIds.has(r.tabId));
    if (validResults.length === 0) return;

    // Ungroup first to avoid mixing prior groups.
    try {
      // chrome.tabs.ungroup exists when tabGroups is supported.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ungroup = (chrome.tabs as any).ungroup as undefined | ((tabIds: number[]) => Promise<void>);
      await ungroup?.(validResults.map(r => r.tabId));
    } catch {
      // ignore
    }

    const byCategory = new Map<string, number[]>();
    for (const r of validResults) {
      const title = r.category?.trim() || 'Other';
      const list = byCategory.get(title) || [];
      list.push(r.tabId);
      byCategory.set(title, list);
    }

    for (const [category, tabIds] of byCategory.entries()) {
      const uniqueTabIds = Array.from(new Set(tabIds));
      if (uniqueTabIds.length === 0) continue;

      try {
        const groupId = await chrome.tabs.group({ tabIds: uniqueTabIds });
        await chrome.tabGroups.update(groupId, {
          title: category,
          color: this.tabGroupColorForCategory(category),
          collapsed: false,
        });
      } catch (e) {
        console.warn('Failed to create/update tab group for category:', category, e);
      }
    }
  }

  async groupTabs(groupId: string, tabIds: number[]): Promise<void> {
    // Manual grouping request from UI.
    if (this.isTabGroupsSupported()) {
      const groupTitle = groupId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const group = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(group, {
        title: groupTitle,
        color: this.tabGroupColorForCategory(groupTitle),
        collapsed: false,
      });
      return;
    }

    // Fallback: store grouping for UI.
    const groups = (await storageService.getCache<Record<string, number[]>>('tab-groups')) || {};
    groups[groupId] = tabIds;
    await storageService.setCache('tab-groups', groups);
  }

  async focusTabGroup(groupId: string): Promise<void> {
    if (this.isTabGroupsSupported()) {
      const numericGroupId = Number(groupId);
      if (!Number.isNaN(numericGroupId) && numericGroupId > 0) {
        const tabs = await chrome.tabs.query({ currentWindow: true, groupId: numericGroupId });
        const first = tabs.find(t => typeof t.id === 'number');
        if (first?.id) await chrome.tabs.update(first.id, { active: true });
      }
      return;
    }

    const groups = (await storageService.getCache<Record<string, number[]>>('tab-groups')) || {};
    const tabIds = groups[groupId] || [];
    if (tabIds.length > 0) await chrome.tabs.update(tabIds[0], { active: true });
  }

  async getTabGroups(): Promise<TabGroup[]> {
    if (this.isTabGroupsSupported()) {
      const groups = await chrome.tabGroups.query({});
      const tabs = await this.getAllTabs({ currentWindow: true });
      const chromeTabs = await chrome.tabs.query({ currentWindow: true });
      const tabById = new Map<number, Tab>(tabs.map(t => [t.id, t]));
      const chromeTabById = new Map<number, chrome.tabs.Tab>(
        chromeTabs
          .filter(t => typeof t.id === 'number')
          .map(t => [t.id as number, t])
      );

      return groups.map(g => {
        const groupTabs = Array.from(chromeTabById.values())
          .filter(t => t.groupId === g.id)
          .map(t => (t.id ? tabById.get(t.id) : undefined))
          .filter((t): t is Tab => Boolean(t));

        return {
          id: String(g.id),
          name: g.title || 'Untitled Group',
          tabs: groupTabs,
        };
      });
    }

    const groups = (await storageService.getCache<Record<string, number[]>>('tab-groups')) || {};
    const allTabs = await this.getAllTabs({ currentWindow: true });
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
