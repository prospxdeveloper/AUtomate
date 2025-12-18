import type { Message, MessageResponse } from '@/types';
import { handleTabMessage } from './handlers/tabHandler';
import { handleMemoryMessage } from './handlers/memoryHandler';
import { handleSuggestionMessage } from './handlers/suggestionHandler';
import { handleUseCaseMessage } from './handlers/useCaseHandler';
import { handleIntegrationMessage } from './handlers/integrationHandler';
import { storageService } from '@/services/StorageService';
import { llmService } from '@/services/LLMService';

/**
 * Background Service Worker - Main entry point for extension
 */

console.log('AUTOME background service worker initialized');

// Initialize storage on startup
storageService.init().catch(console.error);

// Message router
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(response => sendResponse(response))
      .catch(error => {
        console.error('Message handling error:', error);
        sendResponse({
          success: false,
          error: error.message || 'Unknown error',
          requestId: message.requestId,
        });
      });
    
    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: Message,
  _sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  console.log('Received message:', message.type, message.payload);

  try {
    let result: any;

    // Route to appropriate handler based on message type
    if (message.type.startsWith('GET_TABS') || 
        message.type.startsWith('CATEGORIZE_TABS') || 
        message.type.includes('TAB')) {
      result = await handleTabMessage(message);
    } 
    else if (message.type.includes('MEMORY') || message.type === 'CAPTURE_HIGHLIGHT') {
      result = await handleMemoryMessage(message);
    } 
    else if (message.type.includes('SUGGESTION')) {
      result = await handleSuggestionMessage(message);
    } 
    else if (message.type.includes('USE_CASE')) {
      result = await handleUseCaseMessage(message);
    } 
    else if (message.type.includes('INTEGRATION')) {
      result = await handleIntegrationMessage(message);
    } 
    else if (message.type === 'EXTRACT_PAGE_CONTEXT' || message.type === 'GET_PAGE_SUMMARY') {
      result = await handlePageMessage(message);
    }
    else {
      throw new Error(`Unknown message type: ${message.type}`);
    }

    return {
      success: true,
      data: result,
      requestId: message.requestId,
    };
  } catch (error: any) {
    console.error('Message handler error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      requestId: message.requestId,
    };
  }
}

async function handlePageMessage(message: Message): Promise<any> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab?.id) {
    throw new Error('No active tab');
  }

  // Prefer content-script extracted context when available.
  const extractFromContentScript = async (): Promise<any> => {
    try {
      const res = await chrome.tabs.sendMessage(tab.id as number, { type: 'EXTRACT_PAGE_CONTEXT' });
      const data = res?.data;
      if (res?.success && data) return data;
    } catch {
      // ignore and fallback
    }

    return {
      url: tab.url || '',
      title: tab.title || '',
      content: '',
      metadata: { tabId: tab.id },
      timestamp: new Date(),
    };
  };

  if (message.type === 'EXTRACT_PAGE_CONTEXT') {
    return extractFromContentScript();
  }

  if (message.type === 'GET_PAGE_SUMMARY') {
    const ctx = await extractFromContentScript();
    const text = `${ctx?.title || tab.title || ''}\n\n${ctx?.content || ''}`.trim();
    if (!text) return tab.title || '';
    try {
      return await llmService.summarize(text, 280);
    } catch {
      // Fallback: short, non-LLM summary.
      const compact = text.replace(/\s+/g, ' ').trim();
      return compact.length <= 280 ? compact : compact.slice(0, 277) + '...';
    }
  }
}

// Command listeners
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);

  if (command === 'toggle-command-palette') {
    // Send message to content script to show command palette
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'OPEN_COMMAND_PALETTE',
          payload: {},
        });
      }
    });
  }

  if (command === 'categorize-tabs') {
    handleMessage({ type: 'CATEGORIZE_TABS', payload: {} }, {})
      .then(response => {
        console.log('Tabs categorized:', response);
        // Update badge
        chrome.action.setBadgeText({ text: '✓' });
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
      })
      .catch(console.error);
  }
});

// Tab change listener for proactive suggestions
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Trigger suggestion generation after tab loads
    handleMessage({
      type: 'GET_SUGGESTIONS',
      payload: {
        context: {
          url: tab.url || '',
          title: tab.title || '',
          content: '',
          metadata: {},
          timestamp: new Date(),
        }
      }
    }, {}).catch(console.error);
  }
});

// Export for testing
export { handleMessage };
