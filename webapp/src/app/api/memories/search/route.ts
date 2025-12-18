import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { query, limit = 10 } = await request.json();

    // Simple text search in content and tags
    const memories = await prisma.memory.findMany({
      where: {
        OR: [
          { content: { contains: query } },
          { tags: { contains: query } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: memories.map((m: any) => ({
        ...m,
        tags: JSON.parse(m.tags),
        metadata: m.metadata ? JSON.parse(m.metadata) : null,
      })),
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error searching memories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
