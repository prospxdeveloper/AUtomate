import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const memory = await request.json();

    const saved = await prisma.memory.create({
      data: {
        content: memory.content,
        tags: JSON.stringify(memory.tags || []),
        source: memory.source,
        metadata: memory.metadata ? JSON.stringify(memory.metadata) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...saved,
        tags: JSON.parse(saved.tags),
        metadata: saved.metadata ? JSON.parse(saved.metadata) : null,
      },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error saving memory:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
