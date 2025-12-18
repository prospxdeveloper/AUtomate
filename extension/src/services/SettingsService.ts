const STORAGE_KEYS = {
  memoryEnabled: 'autome_memory_enabled',
} as const;

export class SettingsService {
  async getMemoryEnabled(): Promise<boolean> {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.memoryEnabled]);
    const value = stored?.[STORAGE_KEYS.memoryEnabled];
    return typeof value === 'boolean' ? value : true;
  }

  async setMemoryEnabled(enabled: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.memoryEnabled]: Boolean(enabled) });
  }
}

export const settingsService = new SettingsService();
export { STORAGE_KEYS as SETTINGS_STORAGE_KEYS };
