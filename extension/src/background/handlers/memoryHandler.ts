import type { Message } from '@/types';
import { memoryService } from '@/services/MemoryService';

export async function handleMemoryMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'SAVE_MEMORY':
      return memoryService.saveMemory(message.payload);

    case 'SEARCH_MEMORIES':
      return memoryService.searchMemories(
        message.payload.query,
        message.payload.limit
      );

    case 'GET_RELEVANT_MEMORIES':
      return memoryService.getRelevantMemories(
        message.payload.context,
        message.payload.limit
      );

    case 'DELETE_MEMORY':
      await memoryService.deleteMemory(message.payload.id);
      return { success: true };

    case 'CLEAR_ALL_MEMORIES':
      return memoryService.deleteAllMemories();

    case 'CAPTURE_HIGHLIGHT':
      return memoryService.captureHighlight(
        message.payload.text,
        message.payload.url,
        message.payload.title
      );

    default:
      throw new Error(`Unknown memory message type: ${message.type}`);
  }
}
