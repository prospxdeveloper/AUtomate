import type { Message } from '@/types';
import { tabService } from '@/services/TabService';

export async function handleTabMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'GET_TABS':
      return tabService.getAllTabs();

    case 'GET_TAB_GROUPS':
      return tabService.getTabGroups();

    case 'CATEGORIZE_TABS':
      const tabIds = message.payload?.tabIds;
      return tabService.categorizeTabs(tabIds);

    case 'GROUP_TABS':
      await tabService.groupTabs(
        message.payload.groupId,
        message.payload.tabIds
      );
      return { success: true };

    case 'FOCUS_TAB_GROUP':
      await tabService.focusTabGroup(message.payload.groupId);
      return { success: true };

    default:
      throw new Error(`Unknown tab message type: ${message.type}`);
  }
}
