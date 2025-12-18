import type { Message } from '@/types';
import { suggestionService } from '@/services/SuggestionService';

export async function handleSuggestionMessage(message: Message): Promise<any> {
  switch (message.type) {
    case 'GET_SUGGESTIONS':
      return suggestionService.getSuggestions(message.payload?.context);

    case 'EXECUTE_SUGGESTION':
      const result = await suggestionService.executeSuggestion(
        message.payload.suggestionId
      );
      return { success: true, result };

    case 'DISMISS_SUGGESTION':
      suggestionService.dismissSuggestion(message.payload.suggestionId);
      return { success: true };

    default:
      throw new Error(`Unknown suggestion message type: ${message.type}`);
  }
}
