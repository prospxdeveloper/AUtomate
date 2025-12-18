import type { Suggestion, PageContext } from '@/types';
import { memoryService } from './MemoryService';
import { tabService } from './TabService';
import { apiClient } from './APIClient';
import { useCaseService } from './UseCaseService';

/**
 * SuggestionService - Generates proactive AI suggestions
 */
export class SuggestionService {
  private lastSuggestionTime: number = 0;
  private suggestionCooldown: number = 2000; // 2 seconds
  private activeSuggestions: Map<string, Suggestion> = new Map();

  async getSuggestions(context?: PageContext): Promise<Suggestion[]> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastSuggestionTime < this.suggestionCooldown) {
      return Array.from(this.activeSuggestions.values());
    }

    this.lastSuggestionTime = now;

    // Build context
    const currentContext = context || await this.extractCurrentContext();
    
    // Get relevant memories
    const memories = await memoryService.getRelevantMemories(
      currentContext.content,
      3
    );

    // Generate suggestions
    try {
      const suggestions = await this.generateSuggestions(currentContext, memories);
      
      // Store active suggestions
      this.activeSuggestions.clear();
      suggestions.forEach(s => this.activeSuggestions.set(s.id, s));
      
      return suggestions;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  private async extractCurrentContext(): Promise<PageContext> {
    const activeTab = await tabService.getActiveTab();
    
    if (!activeTab) {
      return {
        url: '',
        title: '',
        content: '',
        metadata: {},
        timestamp: new Date(),
      };
    }

    return {
      url: activeTab.url,
      title: activeTab.title,
      content: `Page: ${activeTab.title}`,
      metadata: { tabId: activeTab.id },
      timestamp: new Date(),
    };
  }

  private async generateSuggestions(
    context: PageContext,
    memories: any[]
  ): Promise<Suggestion[]> {
    // Try backend first
    try {
      const result = await apiClient.post<Suggestion[]>(
        '/api/extension/get-suggestions',
        { context, memories }
      );
      return result;
    } catch (error) {
      console.error('Backend suggestion failed, using local:', error);
      return this.generateSuggestionsLocally(context, memories);
    }
  }

  private async generateSuggestionsLocally(
    context: PageContext,
    memories: any[]
  ): Promise<Suggestion[]> {
    // Local heuristic suggestions (no extension-side LLM key required)
    const url = (context?.url || '').toLowerCase();

    const base: Array<{ text: string; action: Suggestion['action']; confidence: number }> = [];

    if (url.includes('gmail')) {
      base.push({
        text: 'Draft a quick follow-up email for this context',
        action: 'COMPOSE_EMAIL',
        confidence: 0.8,
      });
    }

    if (url.includes('youtube')) {
      base.push({
        text: 'Summarize this video and save key takeaways',
        action: 'SUMMARIZE_VIDEO',
        confidence: 0.85,
      });
    }

    // If user has memories enabled and we have any, offer a lightweight reminder.
    if (Array.isArray(memories) && memories.length > 0) {
      base.push({
        text: 'Review related memories for this page',
        action: 'SAVE_MEMORY',
        confidence: 0.6,
      });
    }

    if (base.length === 0) {
      base.push({
        text: 'Save this page to your memories',
        action: 'SAVE_MEMORY',
        confidence: 0.6,
      });
    }

    return base.slice(0, 2).map((s, idx) => ({
      id: `suggestion_${Date.now()}_${idx}`,
      text: s.text,
      action: s.action,
      context: context.url,
      confidence: s.confidence,
      timestamp: new Date(),
    }));
  }

  async executeSuggestion(suggestionId: string): Promise<any> {
    const suggestion = this.activeSuggestions.get(suggestionId);
    
    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    // Execute based on action type
    switch (suggestion.action) {
      case 'SAVE_MEMORY':
        return memoryService.saveMemory({
          // Save a small note pointing back to the page. This is safe and reversible.
          content: suggestion.text,
          tags: [],
          source: suggestion.context,
        });
      
      case 'COMPOSE_EMAIL':
        // Open Gmail compose (service worker safe)
        await chrome.tabs.create({ url: 'https://mail.google.com/mail/?view=cm&fs=1&tf=1' });
        break;

      case 'SUMMARIZE_VIDEO':
        return useCaseService.execute({ useCaseId: 'youtube-summarization', parameters: {} });

      default: {
        // Don't silently no-op: fall back to a safe action.
        return memoryService.saveMemory({
          content: suggestion.text,
          tags: [],
          source: suggestion.context,
        });
      }
    }

    // Remove from active suggestions
    this.activeSuggestions.delete(suggestionId);
  }

  dismissSuggestion(suggestionId: string): void {
    this.activeSuggestions.delete(suggestionId);
  }
}

export const suggestionService = new SuggestionService();
