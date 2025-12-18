import { NextResponse } from 'next/server';
import { getComposioClient, isComposioConfigured } from '@/lib/composio';

export async function GET() {
  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: 'COMPOSIO_API_KEY not configured' },
      { status: 501 }
    );
  }

  try {
    const composio = getComposioClient();
    const resp = await (composio as any).toolkits.get({});

    const items = Array.isArray(resp?.items) ? resp.items : Array.isArray(resp) ? resp : [];

    const data = items
      .map((t: any) => ({
        slug: t?.slug,
        name: t?.name,
        description: t?.description,
        category: t?.category,
      }))
      .filter((t: any) => typeof t.slug === 'string' && t.slug.length > 0);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list Composio toolkits' },
      { status: 500 }
    );
  }
}
