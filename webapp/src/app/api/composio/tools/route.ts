import { NextResponse } from 'next/server';
import { getComposioClient, isComposioConfigured } from '@/lib/composio';

function clampLimit(value: string | null, fallback: number): number {
  const n = value ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

export async function GET(req: Request) {
  if (!isComposioConfigured()) {
    return NextResponse.json(
      { success: false, error: 'COMPOSIO_API_KEY not configured' },
      { status: 501 }
    );
  }

  const url = new URL(req.url);
  const toolkit = url.searchParams.get('toolkit')?.trim() || '';
  const search = url.searchParams.get('search')?.trim() || '';
  const limit = clampLimit(url.searchParams.get('limit'), 50);

  if (!toolkit && !search) {
    return NextResponse.json(
      { success: false, error: 'Provide toolkit or search query' },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();

    let tools: any[] = [];

    if (toolkit) {
      // SDK requires at least one filter; toolkit is the primary discovery path.
      const fetched = await (composio as any).tools.getRawComposioTools({
        toolkits: [toolkit],
        limit: 100,
      });

      tools = Array.isArray(fetched) ? fetched : [];

      if (search) {
        const q = search.toLowerCase();
        tools = tools.filter((t: any) => {
          const hay = `${t?.slug ?? ''} ${t?.name ?? ''} ${t?.description ?? ''}`.toLowerCase();
          return hay.includes(q);
        });
      }

      tools = tools.slice(0, limit);
    } else {
      const fetched = await (composio as any).tools.getRawComposioTools({
        search,
        limit,
      });
      tools = Array.isArray(fetched) ? fetched : [];
    }

    const data = tools
      .map((t: any) => ({
        slug: t?.slug,
        name: t?.name,
        description: t?.description,
        toolkit: t?.toolkit?.slug,
        inputParameters: t?.inputParameters,
      }))
      .filter((t: any) => typeof t.slug === 'string' && t.slug.length > 0);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to list Composio tools' },
      { status: 500 }
    );
  }
}
