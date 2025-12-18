import type { UseCaseDefinition, UseCaseId, UseCaseInput, UseCaseOutput } from '@/types';
import { apiClient } from '@/services/APIClient';
import { memoryService } from '@/services/MemoryService';
import { tabService } from '@/services/TabService';
import { composioService } from '@/services/ComposioService';

type ActivePageContext = { url: string; title: string; content: string };

const FALLBACK_USE_CASES: UseCaseDefinition[] = [
  {
    id: 'youtube-summarization',
    title: 'Summarize YouTube video',
    subtitle: 'Create a concise summary + takeaways',
    searchText: 'youtube summarize video transcript key takeaways',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'email-personalization',
    title: 'Draft personalized email',
    subtitle: 'Generate a personalized outreach draft',
    searchText: 'email draft personalize outreach follow up',
    execution: 'remote',
    supportsScreenshot: false,
    defaultParameters: { recipientName: 'there', goal: 'I wanted to reach out' },
  },
  {
    id: 'meeting-preparation',
    title: 'Prepare meeting brief',
    subtitle: 'Talking points and context for a meeting',
    searchText: 'meeting prep brief talking points',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'meeting-notes',
    title: 'Create meeting notes template',
    subtitle: 'Summary + action items template',
    searchText: 'meeting notes action items follow up',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'email-categorization',
    title: 'Categorize emails',
    subtitle: 'Urgent/medium/low buckets (heuristic)',
    searchText: 'email categorize label urgent medium low',
    execution: 'remote',
    supportsScreenshot: false,
  },
  {
    id: 'data-cleaning',
    title: 'Clean messy data',
    subtitle: 'Standardize and dedupe text/table content',
    searchText: 'data cleaning dedupe normalize csv table',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'research-compilation',
    title: 'Compile research',
    subtitle: 'Create an outline from saved context',
    searchText: 'research compile outline citations tabs',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'resume-update',
    title: 'Update resume',
    subtitle: 'Rewrite bullets from recent accomplishments',
    searchText: 'resume update accomplishments rewrite bullets',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'browser-actions',
    title: 'Browser actions',
    subtitle: 'Run safe click/type/fill actions (requires confirm)',
    searchText: 'browser click type fill automation',
    execution: 'local',
    supportsScreenshot: false,
  },
  {
    id: 'cross-platform-sync',
    title: 'Cross-platform sync',
    subtitle: 'Run a Composio tool slug (requires connection)',
    searchText: 'composio github jira linear slack sync issue create',
    execution: 'local',
    supportsScreenshot: false,
  },
];

export class UseCaseService {
  async listUseCases(): Promise<UseCaseDefinition[]> {
    try {
      const fromServer = await apiClient.get<UseCaseDefinition[]>('/api/extension/use-cases');
      if (Array.isArray(fromServer) && fromServer.length > 0) return fromServer;
      return FALLBACK_USE_CASES;
    } catch {
      return FALLBACK_USE_CASES;
    }
  }

  async execute(input: UseCaseInput): Promise<UseCaseOutput> {
    // Local-only primitives that must run inside the browser.
    if (input.useCaseId === 'browser-actions') {
      return this.executeBrowserActions(input.parameters);
    }

    // Explicit tool runner (Composio) for cross-platform actions.
    if (input.useCaseId === 'cross-platform-sync') {
      return this.executeCrossPlatformSync(input.parameters);
    }

    // Everything else is LLM-defined server-side (unbounded useCaseId).
    return this.executeRemoteUseCase(input);
  }

  private async getActivePageContext(): Promise<ActivePageContext> {
    const activeTab = await tabService.getActiveTab();
    if (!activeTab?.id) {
      return { url: '', title: '', content: '' };
    }

    try {
      const res = await chrome.tabs.sendMessage(activeTab.id, { type: 'EXTRACT_PAGE_CONTEXT' });
      const data = res?.data;
      return {
        url: data?.url || activeTab.url,
        title: data?.title || activeTab.title,
        content: data?.content || '',
      };
    } catch {
      return { url: activeTab.url, title: activeTab.title, content: '' };
    }
  }

  private async saveUseCaseMemory(useCaseId: UseCaseId, content: string, source?: string, metadata?: Record<string, any>) {
    await memoryService.saveMemory({
      content,
      tags: [useCaseId],
      source: source || 'autome',
      metadata: { type: 'use-case', useCaseId, ...(metadata || {}) },
    });
  }

  private async executeRemoteUseCase(input: UseCaseInput): Promise<UseCaseOutput> {
    try {
      const pageContext = await this.getActivePageContext();

      const parameters = { ...(input.parameters || {}) } as Record<string, any>;
      const includeScreenshot = Boolean(parameters?.includeScreenshot);
      if ('includeScreenshot' in parameters) {
        delete parameters.includeScreenshot;
      }

      const screenshotDataUrl = includeScreenshot ? await this.captureVisibleTabPng().catch(() => undefined) : undefined;

      const result = await apiClient.post<any>('/api/extension/execute-use-case', {
        useCaseId: input.useCaseId,
        parameters,
        pageContext,
        screenshotDataUrl,
      });

      const display = typeof result?.content === 'string' ? result.content : JSON.stringify(result, null, 2);
      if (display) {
        await this.saveUseCaseMemory(input.useCaseId, `Use case: ${input.useCaseId}\n\n${display}`, pageContext.url, {
          url: pageContext.url,
          title: pageContext.title,
        }).catch(() => {
          // best-effort
        });
      }

      return {
        useCaseId: input.useCaseId,
        status: 'success',
        data: result,
      };
    } catch (error: any) {
      return {
        useCaseId: input.useCaseId,
        status: 'error',
        error: error?.message || 'Use case failed',
      };
    }
  }

  private async captureVisibleTabPng(): Promise<string> {
    // Best-effort screenshot capture for multimodal models.
    // Requires permissions: tabs + activeTab (already in manifest).
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Failed to capture screenshot');
    }
    return dataUrl;
  }

  private async executeCrossPlatformSync(parameters: Record<string, any>): Promise<UseCaseOutput> {
    try {
      const slug = parameters?.slug as string | undefined;
      const args = (parameters?.args || parameters?.arguments || {}) as Record<string, any>;

      if (!slug) {
        return {
          useCaseId: 'cross-platform-sync',
          status: 'error',
          error: 'Provide a Composio tool slug in parameters.slug to run cross-platform sync.',
        };
      }

      const result = await composioService.execute(slug, args);
      await this.saveUseCaseMemory('cross-platform-sync', `Composio tool executed: ${slug}\n\n${JSON.stringify(result, null, 2)}`, 'autome', {
        slug,
      });

      return {
        useCaseId: 'cross-platform-sync',
        status: 'success',
        data: { slug, result },
      };
    } catch (error: any) {
      return { useCaseId: 'cross-platform-sync', status: 'error', error: error?.message || 'Cross-platform sync failed' };
    }
  }

  private async executeBrowserActions(parameters: Record<string, any>): Promise<UseCaseOutput> {
    try {
      const actions = parameters?.actions;
      if (!Array.isArray(actions) || actions.length === 0) {
        return {
          useCaseId: 'browser-actions',
          status: 'error',
          error: 'Provide parameters.actions as a non-empty array, e.g. {"actions":[{"type":"click","selector":"button"}]}',
        };
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
        return {
          useCaseId: 'browser-actions',
          status: 'error',
          error: 'No valid actions. Allowed types: click | type | fill. Each action must include selector.',
        };
      }

      const activeTab = await tabService.getActiveTab();
      if (!activeTab?.id) {
        return { useCaseId: 'browser-actions', status: 'error', error: 'No active tab found.' };
      }

      const url = String(activeTab.url || '');
      if (!/^https?:\/\//i.test(url)) {
        return { useCaseId: 'browser-actions', status: 'error', error: 'Browser actions only run on http(s) pages.' };
      }

      const res = await chrome.tabs.sendMessage(activeTab.id, {
        type: 'BROWSER_ACTIONS',
        payload: { actions: normalized },
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Browser action failed');
      }

      return {
        useCaseId: 'browser-actions',
        status: 'success',
        data: {
          url,
          results: res?.data,
        },
      };
    } catch (error: any) {
      return { useCaseId: 'browser-actions', status: 'error', error: error?.message || 'Browser action failed' };
    }
  }
}

export const useCaseService = new UseCaseService();
