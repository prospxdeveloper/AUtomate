import type { NotionAdapter, AdapterAuthStatus } from './types';
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

export class NotionAdapterImpl implements NotionAdapter {
  type = 'notion' as const;
  name = 'Notion';

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
        : { connected: false, message: 'Composio configured. Use the sidepanel to connect a Notion Auth Config ID.' };
    } catch {
      return { connected: false, message: 'Composio status unavailable (is webapp running?)' };
    }
  }

  async disconnect(): Promise<void> {
    await composioService.disconnectLocal();
  }

  async createPage(options: { title: string; content: string; databaseId?: string }): Promise<{ pageId: string }> {
    if (!options.databaseId) {
      throw new Error('Notion createPage requires databaseId (parent page/database id) to be provided');
    }

    const createdRaw = await executeWithFallback(
      ['NOTION_CREATE_NOTION_PAGE', 'notion_create_notion_page', 'create_page'],
      {
        parent_id: options.databaseId,
        title: options.title,
      }
    );

    const created = unwrapComposioResult(createdRaw);
    const pageId = String(created?.id || created?.page_id || created?.pageId || '');
    if (!pageId) throw new Error('Failed to create Notion page (missing page id)');

    const content = (options.content || '').trim();
    if (content) {
      await executeWithFallback(
        ['NOTION_ADD_MULTIPLE_PAGE_CONTENT', 'notion_add_multiple_page_content'],
        {
          parent_block_id: pageId,
          content_blocks: [
            {
              content,
              block_property: 'paragraph',
            },
          ],
        }
      );
    }

    return { pageId };
  }
}
