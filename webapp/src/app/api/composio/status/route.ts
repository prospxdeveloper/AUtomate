import { NextResponse } from 'next/server';
import { isComposioConfigured } from '@/lib/composio';

export async function GET() {
  return NextResponse.json({ success: true, data: { configured: isComposioConfigured() } });
}
