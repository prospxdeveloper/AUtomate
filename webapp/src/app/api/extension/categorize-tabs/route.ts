import { NextResponse } from 'next/server';
import { extractJsonFromContent, openRouterChat, toSlug } from '@/lib/openrouter';

type IncomingTab = { id: number; url: string; title?: string };

function heuristicCategorizeTabs(tabs: IncomingTab[]) {
  return tabs.map(tab => {
    const url = (tab.url || '').toLowerCase();
    let category = 'Other';

    if (url.includes('github.com') || url.includes('stackoverflow')) {
      category = 'Development';
    } else if (url.includes('youtube.com') || url.includes('netflix')) {
      category = 'Entertainment';
    } else if (url.includes('gmail') || url.includes('mail')) {
      category = 'Work';
    } else if (url.includes('amazon') || url.includes('ebay')) {
      category = 'Shopping';
    } else if (url.includes('twitter') || url.includes('facebook')) {
      category = 'Social';
    } else if (url.includes('wikipedia') || url.includes('medium')) {
      category = 'Research';
    }

    return {
      tabId: tab.id,
      category,
      groupId: toSlug(category),
      priority: 0,
    };
  });
}

async function llmCategorizeTabs(tabs: IncomingTab[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const allowedCategories = ['Work', 'Personal', 'Research', 'Shopping', 'Social', 'Entertainment', 'Development', 'Other'];

  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
  const payload = tabs.map(t => ({ tabId: t.id, title: t.title || '', url: t.url }));

  const completion = await openRouterChat({
    apiKey,
    model,
    temperature: 0.2,
    maxTokens: 900,
    messages: [
      {
        role: 'system',
        content:
          'You categorize browser tabs into a small set of groups. Return ONLY valid JSON (no markdown, no prose). Output must be a JSON array of objects: {"tabId": number, "category": string, "priority": number}.\n' +
          `Allowed categories: ${allowedCategories.join(', ')}.\n` +
          'Rules: choose the closest category; keep "priority" as an integer 0-100 (0 if unsure). Include every input tabId exactly once.',
      },
      {
        role: 'user',
        content: JSON.stringify({ tabs: payload }),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || '';
  const parsed = extractJsonFromContent(content);
  if (!Array.isArray(parsed)) return null;

  const byId = new Map<number, any>();
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const tabId = Number((item as any).tabId);
    if (!Number.isFinite(tabId)) continue;
    byId.set(tabId, item);
  }

  const results = tabs.map(tab => {
    const raw = byId.get(tab.id);
    const category =
      raw && typeof raw.category === 'string' && allowedCategories.includes(raw.category)
        ? raw.category
        : 'Other';
    const priority = raw && Number.isFinite(Number(raw.priority)) ? Math.max(0, Math.min(100, Math.floor(Number(raw.priority)))) : 0;

    return {
      tabId: tab.id,
      category,
      groupId: toSlug(category),
      priority,
    };
  });

  return results;
}

export async function POST(request: Request) {
  try {
    const { tabs } = await request.json();

    if (!tabs || !Array.isArray(tabs)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tabs data' },
        { status: 400 }
      );
    }

    const incomingTabs: IncomingTab[] = tabs;

    let results = await llmCategorizeTabs(incomingTabs).catch(err => {
      console.error('OpenRouter tab categorization failed, falling back to heuristic:', err);
      return null;
    });

    if (!results) {
      results = heuristicCategorizeTabs(incomingTabs);
    }

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error categorizing tabs:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
