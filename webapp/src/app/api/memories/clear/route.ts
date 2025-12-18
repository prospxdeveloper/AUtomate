import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const result = await prisma.memory.deleteMany({});

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error clearing memories:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
