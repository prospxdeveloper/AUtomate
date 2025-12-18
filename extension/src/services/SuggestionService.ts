import type { Suggestion, PageContext } from '@/types';
import { llmService } from './LLMService';
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
    const memoryContext = memories.map(m => m.content).join('\n');
    const contextStr = `URL: ${context.url}\nTitle: ${context.title}\nContent: ${context.content}`;
    
    const suggestions = await llmService.suggest(contextStr, [memoryContext]);
    
    return suggestions.map((text, index) => ({
      id: `suggestion_${Date.now()}_${index}`,
      text,
      action: this.inferAction(text, context),
      context: context.url,
      confidence: 0.8,
      timestamp: new Date(),
    }));
  }

  private inferAction(suggestionText: string, _context: PageContext): string {
    const lower = suggestionText.toLowerCase();
    
    if (lower.includes('email') || lower.includes('draft')) {
      return 'COMPOSE_EMAIL';
    }
    if (lower.includes('save') || lower.includes('remember')) {
      return 'SAVE_MEMORY';
    }
    if (lower.includes('search') || lower.includes('find')) {
      return 'SEARCH';
    }
    if (lower.includes('summarize')) {
      return 'SUMMARIZE';
    }
    
    return 'CUSTOM';
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
      
      default:
        console.log('Executing custom action:', suggestion.action);
    }

    // Remove from active suggestions
    this.activeSuggestions.delete(suggestionId);
  }

  dismissSuggestion(suggestionId: string): void {
    this.activeSuggestions.delete(suggestionId);
  }
}

export const suggestionService = new SuggestionService();
