import { NextResponse } from 'next/server';
import { getComposioClient, isComposioConfigured } from '@/lib/composio';

export async function POST(req: Request) {
  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: 'COMPOSIO_API_KEY not configured' },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  const slug = body?.slug as string | undefined;
  const userId = body?.userId as string | undefined;
  const args = (body?.arguments ?? body?.args ?? {}) as Record<string, any>;

  if (!slug || !userId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: slug, userId' },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();

    // The TS SDK supports direct execution via composio.tools.execute.
    // Keep this call loosely typed so we can evolve parameters/toolkit versions later.
    const result = await (composio as any).tools.execute({
      slug,
      userId,
      arguments: args,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Composio execute failed' },
      { status: 500 }
    );
  }
}
