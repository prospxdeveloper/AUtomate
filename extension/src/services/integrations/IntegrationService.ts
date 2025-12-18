import type { IntegrationType } from '@/types';
import type { AdapterAuthStatus } from '@/adapters/types';
import { composioService } from '@/services/ComposioService';

export class IntegrationService {
  async getAuthStatus(type: IntegrationType): Promise<AdapterAuthStatus> {
    // Integrations are managed via Composio; type is typically a toolkit slug.
    // We currently track a single local Composio connected account (best-effort).
    try {
      const { configured } = await composioService.getStatus();
      if (!configured) {
        return { connected: false, message: 'Composio not configured (set COMPOSIO_API_KEY in webapp).' };
      }

      const info = await composioService.getLocalConnectionInfo();
      if (info?.connectedAccountId) {
        return {
          connected: true,
          message: `Connected via Composio (account: ${info.connectedAccountId}). Type: ${type}`,
        };
      }
      return { connected: false, message: `Composio configured. Connect an account in the sidepanel. Type: ${type}` };
    } catch {
      return { connected: false, message: 'Composio status unavailable (is webapp running?)' };
    }
  }

  async disconnect(_type: IntegrationType): Promise<void> {
    // Disconnect is global in the current Composio integration.
    await composioService.disconnectLocal();
  }

  listAdapters(): Array<{ type: IntegrationType; name: string }> {
    // Dynamic list from Composio toolkits (best-effort).
    // Returned shape matches the old UI contract.
    return [];
  }
}

export const integrationService = new IntegrationService();
