import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { touchScheduleTimestamp } from '@/lib/touchSettings'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const tutorId = parseInt(idStr);
    
    if (isNaN(tutorId)) return NextResponse.json({ error: 'Invalid Tutor ID' }, { status: 400 });

    const body = await request.json();
    if (!body.name || !body.field) {
      return NextResponse.json({ error: 'Missing subject name or field' }, { status: 400 });
    }

    const newSubject = await prisma.subject.create({
      data: {
        name: body.name,
        field: body.field,
        tutorId: tutorId
      }
    });

    await touchScheduleTimestamp()
    return NextResponse.json({ subject: newSubject }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tutors/[id]/subjects]', error);
    return NextResponse.json({ error: 'Failed to add subject' }, { status: 500 });
  }
}
