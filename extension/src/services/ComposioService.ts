import { apiClient } from '@/services/APIClient';
import { nowMs, telemetryCapture, telemetryIdentify } from '@/analytics/telemetry';

type ComposioStatus = { configured: boolean };

export type ComposioToolkitInfo = {
  slug: string;
  name?: string;
  description?: string;
  category?: string;
};

export type ComposioToolInfo = {
  slug: string;
  name?: string;
  description?: string;
  toolkit?: string;
  inputParameters?: any;
};

type LocalComposioConnectionInfo = {
  authConfigId?: string;
  connectionRequestId?: string;
  connectedAccountId?: string;
};

const STORAGE_KEYS = {
  externalUserId: 'automeExternalUserId',
  authConfigId: 'automeComposioAuthConfigId',
  connectionRequestId: 'automeComposioConnectionRequestId',
  connectedAccountId: 'automeComposioConnectedAccountId',
} as const;

export class ComposioService {
  private userIdCache: string | null = null;

  async getExternalUserId(): Promise<string> {
    if (this.userIdCache) return this.userIdCache;

    const stored = await chrome.storage.local.get([STORAGE_KEYS.externalUserId]);
    const existing = stored[STORAGE_KEYS.externalUserId] as string | undefined;
    if (existing) {
      this.userIdCache = existing;
      telemetryIdentify(existing, { identity_source: 'chrome_storage' });
      return existing;
    }

    const generated = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `autome-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    await chrome.storage.local.set({ [STORAGE_KEYS.externalUserId]: generated });
    this.userIdCache = generated;
    telemetryIdentify(generated, { identity_source: 'generated' });
    return generated;
  }

  async getLocalConnectionInfo(): Promise<LocalComposioConnectionInfo> {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.authConfigId,
      STORAGE_KEYS.connectionRequestId,
      STORAGE_KEYS.connectedAccountId,
    ]);
    return {
      authConfigId: stored[STORAGE_KEYS.authConfigId] as string | undefined,
      connectionRequestId: stored[STORAGE_KEYS.connectionRequestId] as string | undefined,
      connectedAccountId: stored[STORAGE_KEYS.connectedAccountId] as string | undefined,
    };
  }

  async setLocalAuthConfigId(authConfigId: string): Promise<void> {
    const trimmed = authConfigId.trim();
    if (!trimmed) {
      await chrome.storage.local.remove([STORAGE_KEYS.authConfigId]);
      return;
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.authConfigId]: trimmed,
    });
  }

  async clearLocalConnectionInfo(): Promise<void> {
    await chrome.storage.local.remove([
      STORAGE_KEYS.authConfigId,
      STORAGE_KEYS.connectionRequestId,
      STORAGE_KEYS.connectedAccountId,
    ]);
  }

  async resetExternalUserId(): Promise<void> {
    this.userIdCache = null;
    await chrome.storage.local.remove([STORAGE_KEYS.externalUserId]);
  }

  async disconnectLocal(): Promise<void> {
    const startedAt = nowMs();
    telemetryCapture('integration_disconnect_started', {
      provider: 'composio',
    });

    try {
      // NOTE: This is a local disconnect only. It forgets the local user id and cached connection info.
      // To fully revoke tokens, the user must revoke access in the Composio dashboard.
      await this.clearLocalConnectionInfo();
      await this.resetExternalUserId();

      telemetryCapture('integration_disconnect_finished', {
        provider: 'composio',
        success: true,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
      });
    } catch (error: any) {
      telemetryCapture('integration_disconnect_finished', {
        provider: 'composio',
        success: false,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        error_name: error?.name,
      });
      throw error;
    }
  }

  async getStatus(): Promise<ComposioStatus> {
    return apiClient.get<ComposioStatus>('/api/composio/status');
  }

  async listToolkits(): Promise<ComposioToolkitInfo[]> {
    return apiClient.get<ComposioToolkitInfo[]>('/api/composio/toolkits');
  }

  async listTools(query: { toolkit?: string; search?: string; limit?: number } = {}): Promise<ComposioToolInfo[]> {
    const params = new URLSearchParams();
    if (query.toolkit) params.set('toolkit', query.toolkit);
    if (query.search) params.set('search', query.search);
    if (typeof query.limit === 'number') params.set('limit', String(query.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<ComposioToolInfo[]>(`/api/composio/tools${suffix}`);
  }

  async connect(authConfigId: string, callbackUrl?: string): Promise<{ redirectUrl: string; connectionRequestId: string }>{
    const userId = await this.getExternalUserId();
    const startedAt = nowMs();
    telemetryCapture('integration_connect_started', {
      provider: 'composio',
      has_callback_url: Boolean(callbackUrl),
    });

    try {
      const result = await apiClient.post<{ redirectUrl: string; connectionRequestId: string }>('/api/composio/connect', {
        userId,
        authConfigId,
        callbackUrl,
      });

      await chrome.storage.local.set({
        [STORAGE_KEYS.authConfigId]: authConfigId,
        [STORAGE_KEYS.connectionRequestId]: result.connectionRequestId,
      });

      telemetryCapture('integration_connect_finished', {
        provider: 'composio',
        success: true,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
      });

      return result;
    } catch (error: any) {
      telemetryCapture('integration_connect_finished', {
        provider: 'composio',
        success: false,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        error_name: error?.name,
      });
      throw error;
    }
  }

  async waitForConnection(connectionRequestId: string, timeoutSeconds: number = 60): Promise<{ connectedAccountId?: string; status?: string }>{
    const startedAt = nowMs();
    telemetryCapture('integration_wait_started', {
      provider: 'composio',
      timeout_seconds: timeoutSeconds,
    });

    try {
      const result = await apiClient.post<{ connectedAccountId?: string; status?: string }>('/api/composio/wait', {
        connectionRequestId,
        timeoutSeconds,
      });

      if (result?.connectedAccountId) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.connectedAccountId]: result.connectedAccountId,
        });
      }

      telemetryCapture('integration_wait_finished', {
        provider: 'composio',
        success: true,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        status: result?.status,
        has_connected_account: Boolean(result?.connectedAccountId),
      });

      return result;
    } catch (error: any) {
      telemetryCapture('integration_wait_finished', {
        provider: 'composio',
        success: false,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        error_name: error?.name,
      });
      throw error;
    }
  }

  async execute(slug: string, args: Record<string, any> = {}): Promise<any> {
    const userId = await this.getExternalUserId();
    const startedAt = nowMs();
    telemetryCapture('integration_execute_started', {
      provider: 'composio',
      tool_slug: slug,
      arg_count: Object.keys(args || {}).length,
    });

    try {
      const result = await apiClient.post<any>('/api/composio/execute', {
        slug,
        userId,
        arguments: args,
      });

      telemetryCapture('integration_execute_finished', {
        provider: 'composio',
        tool_slug: slug,
        success: true,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
      });

      return result;
    } catch (error: any) {
      telemetryCapture('integration_execute_finished', {
        provider: 'composio',
        tool_slug: slug,
        success: false,
        duration_ms: Math.max(0, Math.round(nowMs() - startedAt)),
        error_name: error?.name,
      });

      throw error;
    }
  }
}

export const composioService = new ComposioService();
