import type { SlackAdapter, AdapterAuthStatus } from './types';
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

export class SlackAdapterImpl implements SlackAdapter {
  type = 'slack' as const;
  name = 'Slack';

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
        : { connected: false, message: 'Composio configured. Use the sidepanel to connect a Slack Auth Config ID.' };
    } catch {
      return { connected: false, message: 'Composio status unavailable (is webapp running?)' };
    }
  }

  async disconnect(): Promise<void> {
    await composioService.disconnectLocal();
  }

  async postMessage(options: { channel: string; text: string }): Promise<{ ts: string }> {
    const raw = await executeWithFallback(
      ['SLACK_SEND_MESSAGE', 'slack_send_message'],
      {
        channel: options.channel,
        text: options.text,
        mrkdwn: true,
      }
    );

    const data = unwrapComposioResult(raw);
    const ts = String(data?.ts || data?.message_ts || data?.data?.ts || '');
    return { ts };
  }
}
