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
    if (!body.day || !body.start || !body.end || !body.location) {
      return NextResponse.json({ error: 'Missing schedule fields' }, { status: 400 });
    }

    const newSchedule = await prisma.schedule.create({
      data: {
        day: body.day,
        start: body.start,
        end: body.end,
        location: body.location,
        tutorId: tutorId
      }
    });

    await touchScheduleTimestamp()
    return NextResponse.json({ schedule: newSchedule }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tutors/[id]/schedules]', error);
    return NextResponse.json({ error: 'Failed to add schedule shift' }, { status: 500 });
  }
}
