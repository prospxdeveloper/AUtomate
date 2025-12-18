import type { Message } from '@/types';
import { storageService } from '@/services/StorageService';
import { integrationService } from '@/services/integrations/IntegrationService';

export async function handleIntegrationMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'GET_INTEGRATIONS':
      // Return registered adapters + persisted integration configs
      return {
        adapters: integrationService.listAdapters(),
        saved: await storageService.getAllIntegrations(),
      };

    case 'ENABLE_INTEGRATION':
      const integration = await storageService.getIntegration(message.payload.integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }
      integration.enabled = true;
      return storageService.saveIntegration(integration);

    case 'DISABLE_INTEGRATION':
      const int = await storageService.getIntegration(message.payload.integrationId);
      if (!int) {
        throw new Error('Integration not found');
      }
      int.enabled = false;
      return storageService.saveIntegration(int);

    case 'TEST_INTEGRATION':
      return integrationService.getAuthStatus(message.payload.integrationType);

    default:
      throw new Error(`Unknown integration message type: ${message.type}`);
  }
}
