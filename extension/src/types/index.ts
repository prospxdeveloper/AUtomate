// ============================================================================
// DOMAIN TYPES (Core Business Objects)
// ============================================================================

export interface Tab {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  category?: string;
  groupId?: string;
  priority?: number;
}

export interface TabGroup {
  id: string;
  name: string;
  tabs: Tab[];
  color?: string;
}

export interface Memory {
  id: string;
  content: string;
  tags: string[];
  source: string;
  timestamp: Date;
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface Suggestion {
  id: string;
  text: string;
  action: string;
  context: string;
  confidence: number;
  timestamp: Date;
}

export interface PageContext {
  url: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export type BrowserActionType = 'click' | 'type' | 'fill';

export interface BrowserAction {
  type: BrowserActionType;
  selector: string;
  text?: string;
}

// ============================================================================
// LLM TYPES
// ============================================================================

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    message: LLMMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface TabCategorizationResult {
  tabId: number;
  category: string;
  groupId: string;
  priority: number;
  reasoning?: string;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  context: string;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

// NOTE: integrations are provided dynamically by Composio (toolkits/tools).
// Keep this as a string so we are not forced to enumerate a finite set.
export type IntegrationType = string;

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  config: Record<string, any>;
  enabled: boolean;
  lastUsed?: Date;
}

export interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  snippet: string;
  date: Date;
  labels: string[];
}

export interface NotionPage {
  id: string;
  title: string;
  content: string;
  properties: Record<string, any>;
}

export interface SlackMessage {
  channel: string;
  text: string;
  user: string;
  timestamp: string;
}

// ============================================================================
// USE CASE TYPES
// ============================================================================

// Use cases are defined server-side and can be unbounded.
export type UseCaseId = string;

export interface UseCaseInput {
  useCaseId: UseCaseId;
  parameters: Record<string, any>;
}

export interface UseCaseOutput {
  useCaseId: UseCaseId;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

export interface UseCaseDefinition {
  id: UseCaseId;
  title: string;
  subtitle?: string;
  searchText?: string;
  execution?: 'local' | 'remote';
  defaultParameters?: Record<string, any>;
  supportsScreenshot?: boolean;
}

export interface EmailPersonalizationInput {
  recipients: Array<{
    name: string;
    email: string;
    company?: string;
    context?: string;
  }>;
  template?: string;
}

export interface MeetingPreparationInput {
  date?: Date;
  attendees?: string[];
}

export interface MeetingPreparationOutput {
  meetings: Array<{
    title: string;
    attendees: string[];
    time: Date;
    brief: string;
    talkingPoints: string[];
    context: string;
  }>;
}

export interface YouTubeSummaryInput {
  videoUrl: string;
}

export interface YouTubeSummaryOutput {
  summary: string;
  keyTakeaways: string[];
  timestamps: Array<{
    time: string;
    description: string;
  }>;
}

// ============================================================================
// MESSAGE TYPES (Extension Communication)
// ============================================================================

export type MessageType =
  // Tab operations
  | 'GET_TABS'
  | 'GET_TAB_GROUPS'
  | 'CATEGORIZE_TABS'
  | 'UNCATEGORIZE_TABS'
  | 'GROUP_TABS'
  | 'FOCUS_TAB_GROUP'
  
  // Memory operations
  | 'SAVE_MEMORY'
  | 'SEARCH_MEMORIES'
  | 'GET_RELEVANT_MEMORIES'
  | 'DELETE_MEMORY'
  | 'CLEAR_ALL_MEMORIES'
  
  // Suggestion operations
  | 'GET_SUGGESTIONS'
  | 'EXECUTE_SUGGESTION'
  | 'DISMISS_SUGGESTION'
  
  // Use case operations
  | 'EXECUTE_USE_CASE'
  | 'GET_USE_CASE_STATUS'
  | 'GET_USE_CASES'

  // Integration operations
  | 'GET_INTEGRATIONS'
  | 'ENABLE_INTEGRATION'
  | 'DISABLE_INTEGRATION'
  | 'TEST_INTEGRATION'
  
  // Page context
  | 'CAPTURE_HIGHLIGHT'
  | 'EXTRACT_PAGE_CONTEXT'
  | 'GET_PAGE_SUMMARY'
  
  // UI operations
  | 'OPEN_COMMAND_PALETTE'
  | 'SHOW_NOTIFICATION'
  | 'UPDATE_BADGE';

export interface Message<T = any> {
  type: MessageType;
  payload: T;
  requestId?: string;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// Payload type mapping
export interface PayloadMap {
  'GET_TABS': undefined;
  'GET_TAB_GROUPS': undefined;
  'CATEGORIZE_TABS': { tabIds?: number[] };
  'UNCATEGORIZE_TABS': { tabIds?: number[] };
  'GROUP_TABS': { groupId: string; tabIds: number[] };
  'FOCUS_TAB_GROUP': { groupId: string };
  
  'SAVE_MEMORY': Omit<Memory, 'id' | 'timestamp'>;
  'SEARCH_MEMORIES': { query: string; limit?: number };
  'GET_RELEVANT_MEMORIES': { context: string; limit?: number };
  'DELETE_MEMORY': { id: string };
  'CLEAR_ALL_MEMORIES': {};
  
  'GET_SUGGESTIONS': { context?: PageContext };
  'EXECUTE_SUGGESTION': { suggestionId: string };
  'DISMISS_SUGGESTION': { suggestionId: string };
  
  'EXECUTE_USE_CASE': UseCaseInput;
  'GET_USE_CASE_STATUS': { executionId: string };
  'GET_USE_CASES': undefined;

  'GET_INTEGRATIONS': undefined;
  'ENABLE_INTEGRATION': { integrationId: string };
  'DISABLE_INTEGRATION': { integrationId: string };
  'TEST_INTEGRATION': { integrationType: IntegrationType };
  
  'CAPTURE_HIGHLIGHT': { text: string; url: string; title: string };
  'EXTRACT_PAGE_CONTEXT': undefined;
  'GET_PAGE_SUMMARY': undefined;
  
  'OPEN_COMMAND_PALETTE': undefined;
  'SHOW_NOTIFICATION': { title: string; message: string };
  'UPDATE_BADGE': { text: string };
}

// Response type mapping
export interface ResponseMap {
  'GET_TABS': Tab[];
  'GET_TAB_GROUPS': TabGroup[];
  'CATEGORIZE_TABS': TabCategorizationResult[];
  'UNCATEGORIZE_TABS': { success: boolean };
  'GROUP_TABS': { success: boolean };
  'FOCUS_TAB_GROUP': { success: boolean };
  
  'SAVE_MEMORY': Memory;
  'SEARCH_MEMORIES': Memory[];
  'GET_RELEVANT_MEMORIES': Memory[];
  'DELETE_MEMORY': { success: boolean };
  'CLEAR_ALL_MEMORIES': { deletedLocal: boolean; deletedBackend?: number };
  
  'GET_SUGGESTIONS': Suggestion[];
  'EXECUTE_SUGGESTION': { success: boolean; result?: any };
  'DISMISS_SUGGESTION': { success: boolean };
  
  'EXECUTE_USE_CASE': { executionId: string; output: UseCaseOutput };
  'GET_USE_CASE_STATUS': UseCaseOutput;
  'GET_USE_CASES': UseCaseDefinition[];
  
  'GET_INTEGRATIONS': { adapters: Array<{ type: IntegrationType; name: string }>; saved: Integration[] };
  'ENABLE_INTEGRATION': Integration;
  'DISABLE_INTEGRATION': Integration;
  'TEST_INTEGRATION': { connected: boolean; message?: string };

  'CAPTURE_HIGHLIGHT': Memory;
  'EXTRACT_PAGE_CONTEXT': PageContext;
  'GET_PAGE_SUMMARY': string;
  
  'OPEN_COMMAND_PALETTE': { success: boolean };
  'SHOW_NOTIFICATION': { success: boolean };
  'UPDATE_BADGE': { success: boolean };
}

// Type-safe message helpers
export type PayloadFor<T extends MessageType> = PayloadMap[T];
export type ResponseFor<T extends MessageType> = ResponseMap[T];

// ============================================================================
// STORAGE TYPES
// ============================================================================

export interface StorageKeys {
  'memories': Memory[];
  'integrations': Integration[];
  'config': AppConfig;
  'cache': Record<string, any>;
}

export interface AppConfig {
  apiBaseUrl: string;
  openRouterApiKey: string;
  theme: 'light' | 'dark';
  autoSuggest: boolean;
  suggestionFrequency: number; // seconds
}

// ============================================================================
// API TYPES (Next.js Routes)
// ============================================================================

export interface APIRequest<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: T;
  headers?: Record<string, string>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
