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
  const userId = body?.userId as string | undefined;
  const authConfigId = body?.authConfigId as string | undefined;
  const callbackUrl = body?.callbackUrl as string | undefined;

  if (!userId || !authConfigId) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: userId, authConfigId' },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();

    // Connect Link flow. The SDK returns a connection request containing an id and redirectUrl.
    const connectionRequest = await (composio as any).connectedAccounts.link({
      userId,
      authConfigId,
      callbackUrl,
    });

    const redirectUrl = connectionRequest?.redirectUrl || connectionRequest?.redirect_url;
    const connectionRequestId = connectionRequest?.id;

    if (!redirectUrl || !connectionRequestId) {
      return NextResponse.json(
        { success: false, error: 'Unexpected Composio response (missing redirectUrl or id)' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        redirectUrl,
        connectionRequestId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Composio connect failed' },
      { status: 500 }
    );
  }
}
