import type { GmailAdapter, AdapterAuthStatus } from './types';
import type { GmailEmail } from '@/types';
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

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return '';
  }
}

function getHeader(headers: Array<{ name?: string; value?: string }> | undefined, name: string): string {
  const found = headers?.find((h) => (h.name || '').toLowerCase() === name.toLowerCase());
  return found?.value || '';
}

function parseEmailList(value: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/<([^>]+)>/);
      return (match?.[1] || part).trim();
    });
}

function findTextBody(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const parts: any[] = Array.isArray(payload.parts) ? payload.parts : [];
  // Prefer text/plain, then text/html, then first decodable part
  const plain = parts.find((p) => p.mimeType === 'text/plain' && p.body?.data);
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  const html = parts.find((p) => p.mimeType === 'text/html' && p.body?.data);
  if (html?.body?.data) return decodeBase64Url(html.body.data);
  for (const p of parts) {
    const nested = findTextBody(p);
    if (nested) return nested;
  }
  return '';
}

export class GmailAdapterImpl implements GmailAdapter {
  type = 'gmail' as const;
  name = 'Gmail';

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
        : { connected: false, message: 'Composio configured. Use the sidepanel to connect a Gmail Auth Config ID.' };
    } catch {
      return { connected: false, message: 'Composio status unavailable (is webapp running?)' };
    }
  }

  async disconnect(): Promise<void> {
    await composioService.disconnectLocal();
  }

  async listRecentEmails(options: { days: number; maxResults: number }): Promise<GmailEmail[]> {
    const raw = await executeWithFallback(
      ['GMAIL_FETCH_EMAILS', 'gmail_fetch_emails'],
      {
        query: `newer_than:${options.days}d`,
        max_results: options.maxResults,
        include_payload: true,
      }
    );

    const data = unwrapComposioResult(raw);
    const messages: any[] =
      data?.messages ||
      data?.emails ||
      data?.data?.messages ||
      data?.data?.emails ||
      (Array.isArray(data) ? data : []);

    return messages.map((m: any): GmailEmail => {
      const payload = m.payload || m.message?.payload;
      const headers = payload?.headers as Array<{ name?: string; value?: string }> | undefined;
      const subject = getHeader(headers, 'Subject') || m.subject || '';
      const from = getHeader(headers, 'From') || m.from || '';
      const toRaw = getHeader(headers, 'To') || m.to || '';
      const dateHeader = getHeader(headers, 'Date');
      const internalDate = typeof m.internalDate === 'string' ? Number(m.internalDate) : undefined;
      const date = internalDate && !Number.isNaN(internalDate) ? new Date(internalDate) : (dateHeader ? new Date(dateHeader) : new Date());
      const body = findTextBody(payload) || m.body || '';
      const snippet = m.snippet || body.slice(0, 200);

      return {
        id: String(m.id || m.messageId || ''),
        threadId: String(m.threadId || m.thread_id || ''),
        subject,
        from,
        to: Array.isArray(toRaw) ? toRaw : parseEmailList(toRaw),
        body,
        snippet,
        date,
        labels: Array.isArray(m.labelIds) ? m.labelIds : (Array.isArray(m.labels) ? m.labels : []),
      };
    });
  }

  async createDraft(options: { to: string; subject: string; body: string }): Promise<{ draftId: string }> {
    const raw = await executeWithFallback(
      ['GMAIL_CREATE_EMAIL_DRAFT', 'gmail_create_email_draft'],
      {
        recipient_email: options.to,
        subject: options.subject,
        body: options.body,
      }
    );

    const data = unwrapComposioResult(raw);
    const draftId = String(data?.id || data?.draftId || data?.draft_id || '');
    if (!draftId) throw new Error('Failed to create Gmail draft (missing draft id)');
    return { draftId };
  }

  async sendDraft(options: { draftId: string }): Promise<{ success: boolean }> {
    await executeWithFallback(
      ['GMAIL_SEND_DRAFT', 'gmail_send_draft'],
      {
        id: options.draftId,
      }
    );
    return { success: true };
  }
}
