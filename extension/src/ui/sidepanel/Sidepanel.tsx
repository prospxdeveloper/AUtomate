import { useEffect, useState } from 'react';
import { useTabStore } from '@/state/tabStore';
import { useMemoryStore } from '@/state/memoryStore';
import { useSuggestionStore } from '@/state/suggestionStore';
import { composioService, type ComposioToolInfo, type ComposioToolkitInfo } from '@/services/ComposioService';
import { settingsService } from '@/services/SettingsService';
import type { UseCaseDefinition } from '@/types';

function schemaRequiredKeys(schema: any): string[] {
  if (!schema) return [];
  if (Array.isArray(schema?.required)) return schema.required.filter((k: any) => typeof k === 'string');
  if (Array.isArray(schema?.inputParameters?.required)) {
    return schema.inputParameters.required.filter((k: any) => typeof k === 'string');
  }
  return [];
}

function schemaProperties(schema: any): Record<string, any> {
  if (!schema) return {};
  if (schema?.properties && typeof schema.properties === 'object') return schema.properties;
  if (schema?.inputParameters?.properties && typeof schema.inputParameters.properties === 'object') return schema.inputParameters.properties;
  return {};
}

function buildArgsTemplate(schema: any): Record<string, any> {
  const required = schemaRequiredKeys(schema);
  const props = schemaProperties(schema);
  const out: Record<string, any> = {};

  for (const key of required) {
    const def = props?.[key];
    const type = def?.type;
    if (type === 'number' || type === 'integer') out[key] = 0;
    else if (type === 'boolean') out[key] = false;
    else if (type === 'array') out[key] = [];
    else if (type === 'object') out[key] = {};
    else out[key] = '';
  }

  return out;
}

function validateArgs(schema: any, args: Record<string, any>): string[] {
  const required = schemaRequiredKeys(schema);
  if (required.length === 0) return [];

  const missing = required.filter((k) => args?.[k] === undefined || args?.[k] === null || args?.[k] === '');
  return missing.map((k) => `Missing required field: ${k}`);
}

export default function Sidepanel() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');
  const { tabs, groups, loading: tabLoading, fetchTabs, categorizeTabs, uncategorizeTabs } = useTabStore();
  const { searchResults, searchMemories } = useMemoryStore();
  const { suggestions, fetchSuggestions, executeSuggestion, dismissSuggestion } = useSuggestionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [useCaseLoading, setUseCaseLoading] = useState(false);
  const [useCaseOutput, setUseCaseOutput] = useState<string>('');

  const [chatInput, setChatInput] = useState<string>('');
  const [chatIncludeScreenshot, setChatIncludeScreenshot] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const [useCaseCatalog, setUseCaseCatalog] = useState<UseCaseDefinition[]>([]);
  const [customUseCaseId, setCustomUseCaseId] = useState<string>('');
  const [customUseCaseParamsJson, setCustomUseCaseParamsJson] = useState<string>('{}');
  const [customUseCaseIncludeScreenshot, setCustomUseCaseIncludeScreenshot] = useState<boolean>(false);
  const [customUseCaseParamsError, setCustomUseCaseParamsError] = useState<string | null>(null);

  // Privacy controls
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(true);
  const [memoryToggleLoading, setMemoryToggleLoading] = useState(false);
  const [memoryControlError, setMemoryControlError] = useState<string | null>(null);
  const [composioConfigured, setComposioConfigured] = useState<boolean | null>(null);
  const [composioLoading, setComposioLoading] = useState(false);
  const [composioError, setComposioError] = useState<string | null>(null);
  const [composioUserId, setComposioUserId] = useState<string>('');
  const [authConfigId, setAuthConfigId] = useState('');
  const [connectionRequestId, setConnectionRequestId] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [connectedAccountId, setConnectedAccountId] = useState('');

  // Cross-platform sync (Composio tool runner)
  const [syncToolkits, setSyncToolkits] = useState<ComposioToolkitInfo[]>([]);
  const [syncToolkitSlug, setSyncToolkitSlug] = useState<string>('');
  const [syncTools, setSyncTools] = useState<ComposioToolInfo[]>([]);
  const [syncToolSearch, setSyncToolSearch] = useState<string>('');
  const [syncSelectedToolSlug, setSyncSelectedToolSlug] = useState<string>('');
  const [syncArgsJson, setSyncArgsJson] = useState<string>('{}');
  const [syncArgsError, setSyncArgsError] = useState<string | null>(null);
  const [syncPreview, setSyncPreview] = useState<string>('');
  const [syncConfirm, setSyncConfirm] = useState<boolean>(false);

  // Browser actions
  const [browserActionsJson, setBrowserActionsJson] = useState<string>('{}');
  const [browserActionsError, setBrowserActionsError] = useState<string | null>(null);
  const [browserActionsPreview, setBrowserActionsPreview] = useState<string>('');
  const [browserActionsConfirm, setBrowserActionsConfirm] = useState<boolean>(false);

  useEffect(() => {
    fetchTabs();
    fetchSuggestions();

    // Use case catalog (best-effort)
    chrome.runtime
      .sendMessage({ type: 'GET_USE_CASES', payload: {} })
      .then((res) => {
        const list = res?.data;
        if (res?.success && Array.isArray(list)) {
          setUseCaseCatalog(list);
        }
      })
      .catch(() => {
        // ignore
      });

    settingsService.getMemoryEnabled().then(setMemoryEnabled).catch(() => setMemoryEnabled(true));

    // Composio status + user id (best-effort)
    composioService.getStatus()
      .then(({ configured }) => setComposioConfigured(configured))
      .catch(() => setComposioConfigured(null));
    composioService.getExternalUserId().then(setComposioUserId).catch(() => setComposioUserId(''));

    // Hydrate any locally cached connection info (best-effort)
    composioService
      .getLocalConnectionInfo()
      .then((info) => {
        if (info.authConfigId) setAuthConfigId(info.authConfigId);
        if (info.connectionRequestId) setConnectionRequestId(info.connectionRequestId);
        if (info.connectedAccountId) setConnectedAccountId(info.connectedAccountId);
      })
      .catch(() => {
        // ignore
      });

    // Tool discovery (best-effort; only when backend is configured)
    composioService
      .getStatus()
      .then(async ({ configured }) => {
        if (!configured) return;
        const toolkits = await composioService.listToolkits().catch(() => []);
        setSyncToolkits(toolkits);
        if (toolkits.length > 0) {
          // Pick a sensible default if available
          const preferred = toolkits.find((t) => t.slug === 'github') || toolkits[0];
          setSyncToolkitSlug(preferred.slug);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const buildCustomUseCaseParameters = (): Record<string, any> => {
    setCustomUseCaseParamsError(null);
    let parsed: any = {};
    try {
      parsed = customUseCaseParamsJson?.trim() ? JSON.parse(customUseCaseParamsJson) : {};
    } catch {
      throw new Error('Parameters must be valid JSON.');
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Parameters JSON must be an object (e.g. { "topic": "..." }).');
    }

    if (customUseCaseIncludeScreenshot) {
      parsed.includeScreenshot = true;
    }

    return parsed;
  };

  const setMemoryEnabledAndPersist = async (enabled: boolean) => {
    setMemoryToggleLoading(true);
    setMemoryControlError(null);
    try {
      await settingsService.setMemoryEnabled(enabled);
      setMemoryEnabled(enabled);
      if (!enabled) {
        setSearchQuery('');
      }
    } catch (e: any) {
      setMemoryControlError(e?.message || 'Failed to update memory setting');
    } finally {
      setMemoryToggleLoading(false);
    }
  };

  const clearAllMemories = async () => {
    setMemoryControlError(null);
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_MEMORIES', payload: {} });
      if (!res?.success) throw new Error(res?.error || 'Failed to clear memories');
      setSearchQuery('');
      setUseCaseOutput(JSON.stringify({ cleared: true, ...(res?.data || {}) }, null, 2));
    } catch (e: any) {
      setMemoryControlError(e?.message || 'Failed to clear memories');
    }
  };

  useEffect(() => {
    if (!syncToolkitSlug) {
      setSyncTools([]);
      return;
    }

    // Fetch tools for selected toolkit (best-effort)
    composioService
      .listTools({ toolkit: syncToolkitSlug, limit: 50 })
      .then((tools) => setSyncTools(tools))
      .catch(() => setSyncTools([]));
  }, [syncToolkitSlug]);

  const selectedTool = syncTools.find((t) => t.slug === syncSelectedToolSlug);

  useEffect(() => {
    // When tool changes, seed args with required template if args are empty/default.
    if (!selectedTool) return;
    const current = syncArgsJson.trim();
    if (current === '' || current === '{}' || current === 'null') {
      const template = buildArgsTemplate(selectedTool.inputParameters);
      setSyncArgsJson(JSON.stringify(template, null, 2));
    }
  }, [syncSelectedToolSlug]);

  const buildSyncPayload = (): { slug: string; args: Record<string, any> } => {
    if (!syncSelectedToolSlug.trim()) {
      throw new Error('Pick a tool first.');
    }

    let parsed: any = {};
    try {
      parsed = syncArgsJson?.trim() ? JSON.parse(syncArgsJson) : {};
    } catch {
      throw new Error('Arguments must be valid JSON.');
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Arguments JSON must be an object (e.g. { "text": "hi" }).');
    }

    const errors = validateArgs(selectedTool?.inputParameters, parsed);
    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return { slug: syncSelectedToolSlug.trim(), args: parsed as Record<string, any> };
  };

  const previewCrossPlatformSync = () => {
    setSyncArgsError(null);
    setSyncPreview('');

    try {
      const payload = buildSyncPayload();
      setSyncPreview(JSON.stringify(payload, null, 2));
    } catch (e: any) {
      setSyncArgsError(e?.message || 'Invalid inputs');
    }
  };

  const executeCrossPlatformSync = async () => {
    setSyncArgsError(null);
    setSyncPreview('');

    try {
      const payload = buildSyncPayload();
      await runUseCase('cross-platform-sync', payload);
    } catch (e: any) {
      setSyncArgsError(e?.message || 'Failed to execute tool');
    }
  };

  const handleCategorize = async () => {
    await categorizeTabs();
  };

  const handleUncategorize = async () => {
    await uncategorizeTabs();
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      await searchMemories(query);
    }
  };

  const buildBrowserActionsPayload = (): Record<string, any> => {
    const parsed = JSON.parse(browserActionsJson || '{}');
    const actions = Array.isArray(parsed?.actions) ? parsed.actions : [];

    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('Provide {"actions":[...]}');
    }

    const normalized = actions
      .map((a: any) => ({
        type: String(a?.type || '').toLowerCase(),
        selector: String(a?.selector || ''),
        text: typeof a?.text === 'string' ? a.text : undefined,
      }))
      .filter((a: any) => a.selector && ['click', 'type', 'fill'].includes(a.type))
      .slice(0, 20);

    if (normalized.length === 0) {
      throw new Error('No valid actions. Allowed types: click | type | fill. Each needs selector.');
    }

    return { actions: normalized };
  };

  const previewBrowserActions = () => {
    setBrowserActionsError(null);
    setBrowserActionsPreview('');
    try {
      const payload = buildBrowserActionsPayload();
      setBrowserActionsPreview(JSON.stringify(payload, null, 2));
    } catch (e: any) {
      setBrowserActionsError(e?.message || 'Invalid JSON');
    }
  };

  const executeBrowserActions = async () => {
    setBrowserActionsError(null);
    setBrowserActionsPreview('');
    try {
      const payload = buildBrowserActionsPayload();
      await runUseCase('browser-actions', payload);
    } catch (e: any) {
      setBrowserActionsError(e?.message || 'Failed to run browser actions');
    }
  };

  const runUseCase = async (useCaseId: string, parameters: Record<string, any> = {}): Promise<any | null> => {
    setUseCaseLoading(true);
    setUseCaseOutput('');

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'EXECUTE_USE_CASE',
        payload: {
          useCaseId,
          parameters,
        },
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Use case failed');
      }

      const output = res?.data?.output;
      if (!output || output.status !== 'success') {
        throw new Error(output?.error || 'Use case failed');
      }

      const data = output?.data ?? null;
      const pretty = JSON.stringify(data ?? {}, null, 2);
      setUseCaseOutput(pretty);
      return data;
    } catch (e: any) {
      setUseCaseOutput(e?.message || 'Failed to run use case');
      return null;
    } finally {
      setUseCaseLoading(false);
    }
  };

  const chatTextFromUseCaseData = (data: any): string => {
    if (!data) return '';
    if (typeof data?.content === 'string' && data.content.trim()) return data.content.trim();
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const sendChat = async () => {
    const prompt = chatInput.trim();
    if (!prompt || useCaseLoading) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: prompt }]);

    const data = await runUseCase('chat', {
      prompt,
      includeScreenshot: chatIncludeScreenshot,
    });

    const assistantText = chatTextFromUseCaseData(data) || (data ? String(data) : 'No response');
    setChatMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
  };

  const remoteCatalog = useCaseCatalog.filter((u) => {
    const id = String((u as any)?.id || '');
    return id && !['browser-actions', 'cross-platform-sync'].includes(id);
  });

  const startComposioConnect = async () => {
    setComposioLoading(true);
    setComposioError(null);
    setConnectedAccountId('');
    setConnectionRequestId('');
    setRedirectUrl('');

    try {
      const status = await composioService.getStatus();
      setComposioConfigured(status.configured);
      if (!status.configured) {
        throw new Error('Composio is not configured on the backend (set COMPOSIO_API_KEY in webapp).');
      }
      if (!authConfigId.trim()) {
        throw new Error('Enter an Auth Config ID first.');
      }

      const res = await composioService.connect(authConfigId.trim());
      setConnectionRequestId(res.connectionRequestId);
      setRedirectUrl(res.redirectUrl);
      await chrome.tabs.create({ url: res.redirectUrl });
    } catch (e: any) {
      setComposioError(e?.message || 'Failed to start Composio connect');
    } finally {
      setComposioLoading(false);
    }
  };

  const waitForComposioConnection = async () => {
    setComposioLoading(true);
    setComposioError(null);
    setConnectedAccountId('');

    try {
      if (!connectionRequestId.trim()) {
        throw new Error('No connectionRequestId yet. Start connect first.');
      }
      const res = await composioService.waitForConnection(connectionRequestId.trim(), 60);
      if (!res.connectedAccountId) {
        throw new Error(`No connectedAccountId returned (status: ${res.status || 'unknown'})`);
      }
      setConnectedAccountId(res.connectedAccountId);
    } catch (e: any) {
      setComposioError(e?.message || 'Failed to wait for Composio connection');
    } finally {
      setComposioLoading(false);
    }
  };

  const disconnectComposioLocal = async () => {
    setComposioLoading(true);
    setComposioError(null);

    try {
      await composioService.disconnectLocal();

      setAuthConfigId('');
      setConnectedAccountId('');
      setConnectionRequestId('');
      setRedirectUrl('');
      setComposioUserId('');

      // Refresh status + regenerated local user id (best-effort)
      composioService.getStatus()
        .then(({ configured }) => setComposioConfigured(configured))
        .catch(() => setComposioConfigured(null));
      composioService.getExternalUserId().then(setComposioUserId).catch(() => setComposioUserId(''));
    } catch (e: any) {
      setComposioError(e?.message || 'Failed to disconnect');
    } finally {
      setComposioLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white/70 dark:bg-dark-bg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-600" />
            <div className="font-semibold text-gray-900 dark:text-dark-text">AUTOME</div>
          </div>
          <div className="text-xs text-gray-600 dark:text-dark-muted">Alt+J</div>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface p-1">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm'
                : 'text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm'
                : 'text-gray-600 dark:text-dark-muted hover:text-gray-900 dark:hover:text-dark-text'
            }`}
          >
            Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'tasks' && (
          <>
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-dark-text">Quick actions</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">Organize your session and review next steps.</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={handleCategorize} disabled={tabLoading} className="btn btn-primary disabled:opacity-50">
                  {tabLoading ? 'Categorizing…' : `Categorize tabs (${tabs.length})`}
                </button>
                <button
                  onClick={handleUncategorize}
                  disabled={tabLoading || groups.length === 0}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Uncategorize
                </button>
                <button onClick={() => fetchSuggestions()} className="btn btn-secondary">
                  Refresh suggestions
                </button>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-dark-text">Tab groups</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">
                    {groups.length > 0 ? `${groups.length} groups` : 'Run categorize to create groups'}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                {groups.length > 0 ? (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <div key={group.id} className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-gray-900 dark:text-dark-text truncate">{group.name}</div>
                          <div className="text-xs text-gray-500 dark:text-dark-muted">{group.tabs.length}</div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {group.tabs.map((tab) => (
                            <div
                              key={tab.id}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border cursor-pointer transition-colors"
                              onClick={() => chrome.tabs.update(tab.id, { active: true })}
                            >
                              {tab.favIconUrl && <img src={tab.favIconUrl} alt="" className="w-4 h-4" />}
                              <span className="text-sm truncate text-gray-700 dark:text-dark-text">{tab.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 dark:text-dark-muted">{tabLoading ? 'Loading…' : 'No groups yet.'}</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-dark-text">Suggestions</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">{suggestions.length} available</div>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {suggestions.length > 0 ? (
                  suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                      <div className="text-sm text-gray-900 dark:text-dark-text">{suggestion.text}</div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => executeSuggestion(suggestion.id)} className="btn btn-primary text-sm py-1">
                          Execute
                        </button>
                        <button onClick={() => dismissSuggestion(suggestion.id)} className="btn btn-secondary text-sm py-1">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 dark:text-dark-muted">No suggestions right now.</div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-dark-text">Memory</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">{memoryEnabled ? 'Enabled' : 'Disabled'} (optional)</div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text">
                  <input
                    type="checkbox"
                    checked={memoryEnabled}
                    disabled={memoryToggleLoading}
                    onChange={(e) => setMemoryEnabledAndPersist(e.target.checked)}
                  />
                  Enable
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder={memoryEnabled ? 'Search memories…' : 'Memory is disabled'}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  disabled={!memoryEnabled}
                  className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button onClick={clearAllMemories} className="btn btn-secondary">
                  Clear all
                </button>
              </div>

              {memoryControlError && <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{memoryControlError}</div>}

              <div className="mt-3 space-y-3">
                {searchResults.length > 0 ? (
                  searchResults.map((memory) => (
                    <div key={memory.id} className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                      <div className="text-sm text-gray-900 dark:text-dark-text">{memory.content}</div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-dark-muted">
                        <div className="flex gap-2 flex-wrap">
                          {memory.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-dark-border rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span>{new Date(memory.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 dark:text-dark-muted">
                    {!memoryEnabled ? 'Memory is disabled.' : searchQuery ? 'No memories found.' : 'Search to find saved context.'}
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-dark-text">Use cases</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">Run a server-defined task on the current page.</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                <div className="font-medium text-gray-900 dark:text-dark-text">Run a custom use case</div>
                <div className="text-sm text-gray-600 dark:text-dark-muted">Use any ID. Parameters must be a JSON object.</div>

                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Use case ID (e.g. summarize-page, extract-table, ...)"
                    value={customUseCaseId}
                    onChange={(e) => setCustomUseCaseId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />

                  <textarea
                    value={customUseCaseParamsJson}
                    onChange={(e) => setCustomUseCaseParamsJson(e.target.value)}
                    rows={3}
                    spellCheck={false}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                  />

                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text">
                      <input
                        type="checkbox"
                        checked={customUseCaseIncludeScreenshot}
                        onChange={(e) => setCustomUseCaseIncludeScreenshot(e.target.checked)}
                      />
                      Include screenshot
                    </label>

                    <button
                      onClick={async () => {
                        setCustomUseCaseParamsError(null);
                        try {
                          if (!customUseCaseId.trim()) throw new Error('Enter a use case ID.');
                          const params = buildCustomUseCaseParameters();
                          await runUseCase(customUseCaseId.trim(), params);
                        } catch (e: any) {
                          setCustomUseCaseParamsError(e?.message || 'Failed to run custom use case');
                        }
                      }}
                      disabled={useCaseLoading}
                      className="btn btn-secondary disabled:opacity-50"
                    >
                      {useCaseLoading ? 'Running…' : 'Run'}
                    </button>
                  </div>

                  {customUseCaseParamsError && (
                    <div className="text-sm text-red-600 whitespace-pre-wrap">{customUseCaseParamsError}</div>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {remoteCatalog.length > 0 ? (
                  remoteCatalog.map((uc) => (
                    <div key={String(uc.id)} className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-dark-text">{uc.title || String(uc.id)}</div>
                        {uc.subtitle && <div className="text-sm text-gray-600 dark:text-dark-muted">{uc.subtitle}</div>}
                      </div>
                      <button
                        onClick={() => runUseCase(String(uc.id), uc.defaultParameters || {})}
                        disabled={useCaseLoading}
                        className="btn btn-secondary disabled:opacity-50"
                      >
                        {useCaseLoading ? 'Running…' : 'Run'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600 dark:text-dark-muted">No use cases available.</div>
                )}
              </div>

              {useCaseOutput && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-dark-text">Last result</div>
                  <pre className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-xs overflow-auto">
                    {useCaseOutput}
                  </pre>
                </div>
              )}
            </div>

            <div className="card">
              <div className="font-semibold text-gray-900 dark:text-dark-text">Advanced</div>
              <div className="text-sm text-gray-600 dark:text-dark-muted">Browser actions and cross-platform sync.</div>

              <div className="mt-3 space-y-4">
                <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                  <div className="font-medium text-gray-900 dark:text-dark-text">Browser actions</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">Provide a JSON list of actions. Supported: click/type/fill.</div>

                  <textarea
                    className="mt-3 w-full h-36 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                    value={browserActionsJson}
                    onChange={(e) => setBrowserActionsJson(e.target.value)}
                    spellCheck={false}
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={previewBrowserActions} className="btn btn-secondary">Preview</button>
                    <button onClick={executeBrowserActions} className="btn btn-primary" disabled={!browserActionsConfirm}>
                      Execute
                    </button>

                    <label className="ml-auto flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text">
                      <input type="checkbox" checked={browserActionsConfirm} onChange={(e) => setBrowserActionsConfirm(e.target.checked)} />
                      I confirm
                    </label>
                  </div>

                  {browserActionsError && <div className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{browserActionsError}</div>}
                  {browserActionsPreview && (
                    <pre className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-xs overflow-auto">
                      {browserActionsPreview}
                    </pre>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                  <div className="font-medium text-gray-900 dark:text-dark-text">Composio connect</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">
                    Backend configured: {composioConfigured === null ? 'unknown' : composioConfigured ? 'yes' : 'no'} • Connected: {connectedAccountId ? 'yes' : 'no'}
                  </div>
                  {composioUserId && <div className="text-xs text-gray-500 dark:text-dark-muted mt-1">User ID: {composioUserId}</div>}

                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Auth Config ID (from Composio dashboard)"
                      value={authConfigId}
                      onChange={(e) => setAuthConfigId(e.target.value)}
                      onBlur={() => {
                        composioService.setLocalAuthConfigId(authConfigId).catch(() => {
                          // ignore
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={startComposioConnect} disabled={composioLoading} className="btn btn-primary disabled:opacity-50">Start connect</button>
                      <button onClick={waitForComposioConnection} disabled={composioLoading} className="btn btn-secondary disabled:opacity-50">Wait</button>
                      <button onClick={disconnectComposioLocal} disabled={composioLoading} className="btn btn-secondary disabled:opacity-50">Disconnect</button>
                    </div>

                    {composioError && <div className="text-sm text-red-600">{composioError}</div>}
                    {redirectUrl && <div className="text-xs text-gray-600 dark:text-dark-muted break-all">Redirect URL opened: {redirectUrl}</div>}
                    {connectionRequestId && <div className="text-xs text-gray-600 dark:text-dark-muted">connectionRequestId: {connectionRequestId}</div>}
                    {connectedAccountId && <div className="text-xs text-gray-600 dark:text-dark-muted">connectedAccountId: {connectedAccountId}</div>}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-dark-border bg-white/60 dark:bg-dark-bg p-3">
                  <div className="font-medium text-gray-900 dark:text-dark-text">Cross-platform sync</div>
                  <div className="text-sm text-gray-600 dark:text-dark-muted">Discover tools, validate args, and run a Composio action.</div>

                  <div className="mt-3 space-y-2">
                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600 dark:text-dark-muted">Toolkit</label>
                      <select
                        value={syncToolkitSlug}
                        onChange={(e) => {
                          setSyncToolkitSlug(e.target.value);
                          setSyncSelectedToolSlug('');
                          setSyncArgsJson('{}');
                          setSyncArgsError(null);
                          setSyncPreview('');
                          setSyncConfirm(false);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                      >
                        <option value="">Select a toolkit</option>
                        {syncToolkits.map((t) => (
                          <option key={t.slug} value={t.slug}>{t.slug}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600 dark:text-dark-muted">Search tools (optional)</label>
                      <input
                        type="text"
                        value={syncToolSearch}
                        onChange={(e) => setSyncToolSearch(e.target.value)}
                        placeholder="e.g., issue, message, create"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600 dark:text-dark-muted">Tool</label>
                      <select
                        value={syncSelectedToolSlug}
                        onChange={(e) => {
                          setSyncSelectedToolSlug(e.target.value);
                          setSyncArgsError(null);
                          setSyncPreview('');
                          setSyncConfirm(false);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text"
                      >
                        <option value="">Select a tool</option>
                        {syncTools
                          .filter((t) => {
                            if (!syncToolSearch.trim()) return true;
                            const q = syncToolSearch.toLowerCase();
                            const hay = `${t.slug ?? ''} ${t.name ?? ''} ${t.description ?? ''}`.toLowerCase();
                            return hay.includes(q);
                          })
                          .map((t) => (
                            <option key={t.slug} value={t.slug}>{t.slug}</option>
                          ))}
                      </select>
                    </div>

                    {selectedTool?.description && <div className="text-xs text-gray-600 dark:text-dark-muted">{selectedTool.description}</div>}
                    {schemaRequiredKeys(selectedTool?.inputParameters).length > 0 && (
                      <div className="text-xs text-gray-600 dark:text-dark-muted">
                        Required: {schemaRequiredKeys(selectedTool?.inputParameters).join(', ')}
                      </div>
                    )}

                    <div className="grid gap-2">
                      <label className="text-xs text-gray-600 dark:text-dark-muted">Arguments (JSON object)</label>
                      <textarea
                        value={syncArgsJson}
                        onChange={(e) => setSyncArgsJson(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text font-mono text-xs"
                      />
                    </div>

                    <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-dark-muted">
                      <input type="checkbox" checked={syncConfirm} onChange={(e) => setSyncConfirm(e.target.checked)} className="mt-0.5" />
                      I understand this may modify data in connected apps.
                    </label>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={previewCrossPlatformSync} disabled={!syncSelectedToolSlug || useCaseLoading} className="btn btn-secondary disabled:opacity-50">
                        Preview
                      </button>
                      <button onClick={executeCrossPlatformSync} disabled={!syncConfirm || !syncSelectedToolSlug || useCaseLoading} className="btn btn-primary disabled:opacity-50">
                        {useCaseLoading ? 'Running…' : 'Execute'}
                      </button>
                    </div>

                    {syncArgsError && <div className="text-sm text-red-600 whitespace-pre-wrap">{syncArgsError}</div>}
                    {syncPreview && <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-dark-text bg-gray-50 dark:bg-dark-border p-3 rounded">{syncPreview}</pre>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'chat' && (
          <div className="card flex flex-col min-h-[60vh]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-gray-900 dark:text-dark-text">Chat</div>
                <div className="text-sm text-gray-600 dark:text-dark-muted">Ask AUTOME about the current page.</div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text">
                <input type="checkbox" checked={chatIncludeScreenshot} onChange={(e) => setChatIncludeScreenshot(e.target.checked)} />
                Screenshot
              </label>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-auto">
              {chatMessages.length === 0 ? (
                <div className="text-sm text-gray-600 dark:text-dark-muted">Start by asking a question.</div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border border-gray-200 dark:border-dark-border p-3 ${
                      m.role === 'user' ? 'bg-white/60 dark:bg-dark-bg' : 'bg-gray-50 dark:bg-dark-surface'
                    }`}
                  >
                    <div className="text-xs text-gray-500 dark:text-dark-muted mb-1">{m.role === 'user' ? 'You' : 'AUTOME'}</div>
                    <div className="text-sm text-gray-900 dark:text-dark-text whitespace-pre-wrap">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="Ask something…"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button onClick={() => void sendChat()} disabled={useCaseLoading || !chatInput.trim()} className="btn btn-primary disabled:opacity-50">
                {useCaseLoading ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
