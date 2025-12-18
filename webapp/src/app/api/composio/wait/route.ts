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
  const connectionRequestId = body?.connectionRequestId as string | undefined;
  const timeoutSeconds =
    typeof body?.timeoutSeconds === 'number' ? Math.max(1, Math.min(300, body.timeoutSeconds)) : 60;

  if (!connectionRequestId) {
    return NextResponse.json(
      { success: false, error: 'Missing required field: connectionRequestId' },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();

    const connectedAccount = await (composio as any).connectedAccounts.waitForConnection(
      connectionRequestId,
      timeoutSeconds
    );

    return NextResponse.json({
      success: true,
      data: {
        connectedAccountId: connectedAccount?.id,
        status: connectedAccount?.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Composio wait failed' },
      { status: 500 }
    );
  }
}
