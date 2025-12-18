import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Memory, Integration } from '@/types';

interface AutomeDB extends DBSchema {
  memories: {
    key: string;
    value: Memory;
    indexes: { 'by-timestamp': Date; 'by-source': string };
  };
  integrations: {
    key: string;
    value: Integration;
    indexes: { 'by-type': string };
  };
  cache: {
    key: string;
    value: any;
  };
}

/**
 * StorageService - IndexedDB abstraction layer
 */
export class StorageService {
  private db: IDBPDatabase<AutomeDB> | null = null;
  private readonly dbName = 'autome-db';
  private readonly version = 1;

  async init(): Promise<void> {
    this.db = await openDB<AutomeDB>(this.dbName, this.version, {
      upgrade(db) {
        // Memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id' });
          memoryStore.createIndex('by-timestamp', 'timestamp');
          memoryStore.createIndex('by-source', 'source');
        }

        // Integrations store
        if (!db.objectStoreNames.contains('integrations')) {
          const integrationStore = db.createObjectStore('integrations', { keyPath: 'id' });
          integrationStore.createIndex('by-type', 'type');
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      },
    });
  }

  // Memory operations
  async saveMemory(memory: Memory): Promise<Memory> {
    if (!this.db) await this.init();
    await this.db!.put('memories', memory);
    return memory;
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('memories', id);
  }

  async getAllMemories(): Promise<Memory[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('memories');
  }

  async searchMemories(query: string, limit: number = 10): Promise<Memory[]> {
    if (!this.db) await this.init();
    const allMemories = await this.db!.getAll('memories');
    
    // Simple text search - can be enhanced with fuzzy search
    const results = allMemories.filter(memory => {
      const searchText = `${memory.content} ${memory.tags.join(' ')}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });

    return results.slice(0, limit);
  }

  async deleteMemory(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('memories', id);
  }

  async deleteOldMemories(days: number): Promise<void> {
    if (!this.db) await this.init();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const allMemories = await this.db!.getAll('memories');
    const toDelete = allMemories.filter(m => m.timestamp < cutoff);
    
    for (const memory of toDelete) {
      await this.db!.delete('memories', memory.id);
    }
  }

  async clearMemories(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('memories');
  }

  // Integration operations
  async saveIntegration(integration: Integration): Promise<Integration> {
    if (!this.db) await this.init();
    await this.db!.put('integrations', integration);
    return integration;
  }

  async getIntegration(id: string): Promise<Integration | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('integrations', id);
  }

  async getAllIntegrations(): Promise<Integration[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('integrations');
  }

  async deleteIntegration(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('integrations', id);
  }

  // Cache operations
  async setCache(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();
    const cacheData = {
      value,
      timestamp: Date.now(),
      ttl,
    };
    await this.db!.put('cache', cacheData, key);
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    if (!this.db) await this.init();
    const cached = await this.db!.get('cache', key);
    
    if (!cached) return null;
    
    // Check TTL
    if (cached.ttl && Date.now() - cached.timestamp > cached.ttl * 1000) {
      await this.db!.delete('cache', key);
      return null;
    }
    
    return cached.value;
  }

  async deleteCache(key: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('cache', key);
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('cache');
  }
}

export const storageService = new StorageService();
