import type { GitHubAdapter, AdapterAuthStatus } from './types';
import { composioService } from '@/services/ComposioService';

function isToolNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /tool.*not found|unknown tool|not found/i.test(message);
}

async function executeWithFallback(slugs: string[], args: Record<string, any>): Promise<any> {
  let lastError: unknown;
  for (const slug of slugs) {
    try {
      return await composioService.execute(slug, args);
    } catch (error) {
      lastError = error;
      if (!isToolNotFoundError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Composio tool execution failed');
}

function unwrapComposioResult(result: any): any {
  if (result && typeof result === 'object') {
    if (result.successful === false) {
      throw new Error(result.error || 'Composio tool failed');
    }
    if (result.error && result.successful !== true) {
      throw new Error(result.error);
    }
    if ('data' in result) return (result as any).data;
  }
  return result;
}

export class GitHubAdapterImpl implements GitHubAdapter {
  type = 'github' as const;
  name = 'GitHub';

  async getAuthStatus(): Promise<AdapterAuthStatus> {
    try {
      const { configured } = await composioService.getStatus();
      if (!configured) {
        return { connected: false, message: 'Composio not configured (set COMPOSIO_API_KEY in webapp).' };
      }

      const info = await composioService.getLocalConnectionInfo();
      const connected = Boolean(info.connectedAccountId);
      return connected
        ? { connected: true, message: `Connected via Composio (account: ${info.connectedAccountId}). To fully revoke, use the Composio dashboard.` }
        : { connected: false, message: 'Composio configured. Use the sidepanel to connect a GitHub Auth Config ID.' };
    } catch {
      return { connected: false, message: 'Composio status unavailable (is webapp running?)' };
    }
  }

  async disconnect(): Promise<void> {
    await composioService.disconnectLocal();
  }

  async createIssue(options: { owner: string; repo: string; title: string; body?: string; labels?: string[] }): Promise<{ issueUrl: string }> {
    const raw = await executeWithFallback(
      ['GITHUB_CREATE_AN_ISSUE', 'GITHUB_CREATE_ISSUE', 'github_create_an_issue', 'github_create_issue'],
      {
        owner: options.owner,
        repo: options.repo,
        title: options.title,
        body: options.body,
        labels: options.labels,
      }
    );

    const data = unwrapComposioResult(raw);
    const issueUrl = String(data?.html_url || data?.url || data?.issueUrl || data?.issue_url || '');
    if (!issueUrl) {
      // Fall back to a best-effort GitHub URL if the API response is minimal
      return { issueUrl: `https://github.com/${options.owner}/${options.repo}/issues` };
    }
    return { issueUrl };
  }
}
