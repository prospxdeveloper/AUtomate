import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    await prisma.memory.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
