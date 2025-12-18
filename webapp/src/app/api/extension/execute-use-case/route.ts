import { NextResponse } from 'next/server';
import { extractJsonFromContent, openRouterChat } from '@/lib/openrouter';

type Incoming = {
  useCaseId?: string;
  parameters?: Record<string, any>;
  pageContext?: { url?: string; title?: string; content?: string };
  // Optional: data URL (e.g. "data:image/png;base64,...")
  screenshotDataUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Incoming;

    const useCaseId = String(body?.useCaseId || '').trim();
    if (!useCaseId) {
      return NextResponse.json({ success: false, error: 'Missing useCaseId' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OPENROUTER_API_KEY not configured' }, { status: 400 });
    }

    const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    const pageContext = {
      url: String(body?.pageContext?.url || ''),
      title: String(body?.pageContext?.title || ''),
      content: String(body?.pageContext?.content || '').slice(0, 12000),
    };

    const parameters = (body?.parameters && typeof body.parameters === 'object' ? body.parameters : {}) as Record<string, any>;

    const screenshotDataUrl = typeof body?.screenshotDataUrl === 'string' ? body.screenshotDataUrl : '';
    const hasImage = screenshotDataUrl.startsWith('data:image/');

    const userPayload = {
      useCaseId,
      parameters,
      pageContext,
      instructions:
        'Return ONLY valid JSON (no markdown, no prose). Shape: {"content": string, "data": object|null}. ' +
        'Keep content concise, actionable, and grounded in the provided context. ' +
        'If info is missing, ask a short clarification question inside content.',
    };

    const completion = await openRouterChat({
      apiKey,
      model,
      temperature: 0.3,
      maxTokens: 900,
      messages: [
        {
          role: 'system',
          content: `You are AUTOME. Execute a user-requested use case.
You may receive page DOM context and optionally a screenshot.
You must not fabricate; if needed, ask for clarification.
Output MUST be valid JSON only.`,
        },
        {
          role: 'user',
          content: hasImage
            ? [
                { type: 'text', text: JSON.stringify(userPayload) },
                { type: 'image_url', image_url: { url: screenshotDataUrl } },
              ]
            : JSON.stringify(userPayload),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    let parsed: any = null;
    try {
      parsed = extractJsonFromContent(raw);
    } catch {
      parsed = null;
    }

    const content = typeof parsed?.content === 'string' ? parsed.content : String(raw || '').trim();

    return NextResponse.json({
      success: true,
      data: {
        useCaseId,
        model,
        content,
        data: parsed && typeof parsed === 'object' ? (parsed.data ?? null) : null,
        hasImage,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error executing use case:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
