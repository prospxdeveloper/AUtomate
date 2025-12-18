import type { Memory } from '@/types';
import { llmService } from './LLMService';
import { storageService } from './StorageService';
import { apiClient } from './APIClient';
import { nowMs, telemetryCapture } from '@/analytics/telemetry';
import { settingsService } from './SettingsService';

/**
 * MemoryService - Manages browser memories (highlights, notes, etc.)
 */
export class MemoryService {
  private async ensureEnabled(): Promise<void> {
    const enabled = await settingsService.getMemoryEnabled();
    if (!enabled) {
      throw new Error('Memory is disabled in privacy settings');
    }
  }

  async saveMemory(memory: Omit<Memory, 'id' | 'timestamp'>): Promise<Memory> {
    await this.ensureEnabled();
    const startedAt = nowMs();
    const fullMemory: Memory = {
      ...memory,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Auto-generate tags if not provided
    if (!fullMemory.tags || fullMemory.tags.length === 0) {
      try {
        fullMemory.tags = await llmService.extractTags(fullMemory.content);
      } catch {
        fullMemory.tags = this.extractTagsHeuristic(fullMemory.content);
      }
    }

    // Save locally
    await storageService.saveMemory(fullMemory);

    telemetryCapture('memory_saved', {
      tag_count: Array.isArray(fullMemory.tags) ? fullMemory.tags.length : 0,
      content_length: typeof fullMemory.content === 'string' ? fullMemory.content.length : 0,
      has_source: Boolean(fullMemory.source),
      metadata_type: (fullMemory.metadata as any)?.type,
      duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
    });

    // Sync to backend (fire and forget)
    this.syncToBackend(fullMemory).catch(console.error);

    return fullMemory;
  }

  private extractTagsHeuristic(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !['this', 'that', 'with', 'from', 'have', 'your', 'into', 'about', 'https', 'http'].includes(w));

    const counts = new Map<string, number>();
    for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
  }

  async captureHighlight(text: string, url: string, title: string): Promise<Memory> {
    await this.ensureEnabled();
    return this.saveMemory({
      content: text,
      tags: [],
      source: url,
      metadata: { title, type: 'highlight' },
    });
  }

  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    const enabled = await settingsService.getMemoryEnabled();
    if (!enabled) return [];

    const startedAt = nowMs();
    // Try local search first
    const localResults = await storageService.searchMemories(query, limit);
    
    if (localResults.length >= limit) {
      telemetryCapture('memory_search', {
        query_length: typeof query === 'string' ? query.length : 0,
        limit,
        result_count: localResults.length,
        source: 'local',
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
      });
      return localResults;
    }

    // Fallback to backend for semantic search
    try {
      const backendResults = await apiClient.post<Memory[]>(
        '/api/memories/search',
        { query, limit }
      );

      telemetryCapture('memory_search', {
        query_length: typeof query === 'string' ? query.length : 0,
        limit,
        result_count: backendResults.length,
        source: 'backend',
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
      });

      return backendResults;
    } catch (error) {
      console.error('Backend search failed, using local results:', error);

      telemetryCapture('memory_search', {
        query_length: typeof query === 'string' ? query.length : 0,
        limit,
        result_count: localResults.length,
        source: 'local_fallback',
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        error_name: (error as any)?.name,
      });
      return localResults;
    }
  }

  async getRelevantMemories(context: string, limit: number = 5): Promise<Memory[]> {
    const enabled = await settingsService.getMemoryEnabled();
    if (!enabled) return [];

    // Simple relevance: search for keywords in context
    const keywords = context
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    const allMemories = await storageService.getAllMemories();
    
    // Score memories by keyword matches
    const scored = allMemories.map(memory => {
      const memoryText = `${memory.content} ${memory.tags.join(' ')}`.toLowerCase();
      const score = keywords.reduce((acc, keyword) => {
        return acc + (memoryText.includes(keyword) ? 1 : 0);
      }, 0);
      
      return { memory, score };
    });

    // Sort by score and recency
    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.memory.timestamp.getTime() - a.memory.timestamp.getTime();
    });

    return scored
      .filter(item => item.score > 0)
      .slice(0, limit)
      .map(item => item.memory);
  }

  async deleteMemory(id: string): Promise<void> {
    await storageService.deleteMemory(id);

    telemetryCapture('memory_deleted', {
      has_id: Boolean(id),
    });
    
    // Sync deletion to backend
    apiClient.post('/api/memories/delete', { id }).catch(console.error);
  }

  async deleteAllMemories(): Promise<{ deletedLocal: boolean; deletedBackend?: number } > {
    await storageService.clearMemories();

    let deletedBackend: number | undefined;
    try {
      const res = await apiClient.post<{ deletedCount: number }>('/api/memories/clear', {});
      deletedBackend = res?.deletedCount;
    } catch {
      // best-effort; local wipe still succeeded
    }

    telemetryCapture('memory_cleared', {
      deleted_backend: typeof deletedBackend === 'number',
    });

    return { deletedLocal: true, deletedBackend };
  }

  async cleanup(days: number = 30): Promise<void> {
    await storageService.deleteOldMemories(days);
  }

  private generateId(): string {
    return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async syncToBackend(memory: Memory): Promise<void> {
    try {
      await apiClient.post('/api/memories/save', memory);
    } catch (error) {
      console.error('Failed to sync memory to backend:', error);
    }
  }
}

export const memoryService = new MemoryService();
