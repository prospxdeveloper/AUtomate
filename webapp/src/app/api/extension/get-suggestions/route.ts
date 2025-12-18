import { NextResponse } from 'next/server';
import { extractJsonFromContent, openRouterChat } from '@/lib/openrouter';

type SuggestionAction = 'SAVE_MEMORY' | 'COMPOSE_EMAIL' | 'SUMMARIZE_VIDEO';

function heuristicSuggestions(context: any) {
  const suggestions: any[] = [];
  const url = (context?.url || '').toLowerCase();

  if (url.includes('gmail')) {
    suggestions.push({
      text: 'Draft a quick follow-up email for this context',
      action: 'COMPOSE_EMAIL' as const,
      confidence: 0.8,
    });
  }

  if (url.includes('youtube')) {
    suggestions.push({
      text: 'Summarize this video and save key takeaways',
      action: 'SUMMARIZE_VIDEO' as const,
      confidence: 0.85,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      text: 'Save this page to your memories',
      action: 'SAVE_MEMORY' as const,
      confidence: 0.6,
    });
  }

  return suggestions;
}

async function llmSuggestions(context: any, memories: any[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const allowedActions: SuggestionAction[] = ['SAVE_MEMORY', 'COMPOSE_EMAIL', 'SUMMARIZE_VIDEO'];
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

  const compactContext = {
    url: context?.url || '',
    title: context?.title || '',
    content: String(context?.content || '').slice(0, 1500),
  };
  const compactMemories = Array.isArray(memories)
    ? memories
        .slice(0, 3)
        .map(m => String(m?.content || '').slice(0, 400))
        .filter(Boolean)
    : [];

  const completion = await openRouterChat({
    apiKey,
    model,
    temperature: 0.4,
    maxTokens: 600,
    messages: [
      {
        role: 'system',
        content:
          'You generate 1-2 helpful, user-initiated suggestions for a browser copilot. Return ONLY valid JSON (no markdown, no prose). Output must be a JSON array of objects: {"text": string, "action": string}.\n' +
          `Allowed actions: ${allowedActions.join(', ')}.\n` +
          'Rules: keep text under 120 characters; suggestions must be safe and not take irreversible actions.',
      },
      {
        role: 'user',
        content: JSON.stringify({ context: compactContext, memories: compactMemories }),
      },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || '';
  const parsed = extractJsonFromContent(content);
  if (!Array.isArray(parsed)) return null;

  const normalized = parsed
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const text = typeof (item as any).text === 'string' ? (item as any).text.trim() : '';
      const action = (item as any).action as SuggestionAction;
      if (!text) return null;
      if (!allowedActions.includes(action)) return null;
      return { text: text.slice(0, 120), action };
    })
    .filter(Boolean) as Array<{ text: string; action: SuggestionAction }>;

  if (normalized.length === 0) return null;
  return normalized;
}

export async function POST(request: Request) {
  try {
    const { context, memories } = await request.json();

    const baseUrl = context?.url || '';
    const fromLlm = await llmSuggestions(context, memories).catch(err => {
      console.error('OpenRouter suggestions failed, falling back to heuristic:', err);
      return null;
    });

    const rawSuggestions = fromLlm || heuristicSuggestions(context);
    const suggestions = rawSuggestions.slice(0, 2).map((s: any, idx: number) => ({
      id: `suggestion_${Date.now()}_${idx + 1}`,
      text: s.text,
      action: s.action,
      context: baseUrl,
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.75,
      timestamp: new Date(),
    }));

    return NextResponse.json({
      success: true,
      data: suggestions,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
