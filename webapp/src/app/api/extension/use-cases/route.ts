import { NextResponse } from 'next/server';

type UseCaseDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  searchText?: string;
  execution?: 'local' | 'remote';
  defaultParameters?: Record<string, any>;
  supportsScreenshot?: boolean;
};

const USE_CASES: UseCaseDefinition[] = [
  {
    id: 'youtube-summarization',
    title: 'Summarize YouTube video',
    subtitle: 'Create a concise summary + takeaways',
    searchText: 'youtube summarize video transcript key takeaways',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'email-personalization',
    title: 'Draft personalized email',
    subtitle: 'Generate a personalized outreach draft',
    searchText: 'email draft personalize outreach follow up',
    execution: 'remote',
    supportsScreenshot: false,
    defaultParameters: { recipientName: 'there', goal: 'I wanted to reach out' },
  },
  {
    id: 'meeting-preparation',
    title: 'Prepare meeting brief',
    subtitle: 'Talking points and context for a meeting',
    searchText: 'meeting prep brief talking points',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'meeting-notes',
    title: 'Create meeting notes template',
    subtitle: 'Summary + action items template',
    searchText: 'meeting notes action items follow up',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'email-categorization',
    title: 'Categorize emails',
    subtitle: 'Urgent/medium/low buckets (heuristic)',
    searchText: 'email categorize label urgent medium low',
    execution: 'remote',
    supportsScreenshot: false,
  },
  {
    id: 'data-cleaning',
    title: 'Clean messy data',
    subtitle: 'Standardize and dedupe text/table content',
    searchText: 'data cleaning dedupe normalize csv table',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'research-compilation',
    title: 'Compile research',
    subtitle: 'Create an outline from saved context',
    searchText: 'research compile outline citations tabs',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'resume-update',
    title: 'Update resume',
    subtitle: 'Rewrite bullets from recent accomplishments',
    searchText: 'resume update accomplishments rewrite bullets',
    execution: 'remote',
    supportsScreenshot: true,
  },
  {
    id: 'browser-actions',
    title: 'Browser actions',
    subtitle: 'Run safe click/type/fill actions (requires confirm)',
    searchText: 'browser click type fill automation',
    execution: 'local',
    supportsScreenshot: false,
  },
  {
    id: 'cross-platform-sync',
    title: 'Cross-platform sync',
    subtitle: 'Run a Composio tool slug (requires connection)',
    searchText: 'composio github jira linear slack sync issue create',
    execution: 'local',
    supportsScreenshot: false,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: USE_CASES,
    timestamp: new Date(),
  });
}
