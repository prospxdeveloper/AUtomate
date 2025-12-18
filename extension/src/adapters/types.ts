import type { IntegrationType, GmailEmail } from '@/types';

export interface AdapterAuthStatus {
  connected: boolean;
  message?: string;
}

export interface AdapterBase {
  type: IntegrationType;
  name: string;

  getAuthStatus(): Promise<AdapterAuthStatus>;
  disconnect(): Promise<void>;
}

export interface GmailAdapter extends AdapterBase {
  type: 'gmail';
  listRecentEmails(options: { days: number; maxResults: number }): Promise<GmailEmail[]>;
  createDraft(options: { to: string; subject: string; body: string }): Promise<{ draftId: string }>;
  sendDraft(options: { draftId: string }): Promise<{ success: boolean }>;
}

export interface NotionAdapter extends AdapterBase {
  type: 'notion';
  createPage(options: { title: string; content: string; databaseId?: string }): Promise<{ pageId: string }>;
}

export interface SlackAdapter extends AdapterBase {
  type: 'slack';
  postMessage(options: { channel: string; text: string }): Promise<{ ts: string }>;
}

export interface GitHubAdapter extends AdapterBase {
  type: 'github';
  createIssue(options: { owner: string; repo: string; title: string; body?: string; labels?: string[] }): Promise<{ issueUrl: string }>;
}

export type AnyAdapter =
  | GmailAdapter
  | NotionAdapter
  | SlackAdapter
  | GitHubAdapter;
