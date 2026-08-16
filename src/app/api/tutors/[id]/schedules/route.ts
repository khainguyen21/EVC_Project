import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { touchScheduleTimestamp } from '@/lib/touchSettings'
import { verifySession } from '@/lib/session'
import { toMinutes } from '@/utils/availability'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySession()
    const { id: idStr } = await params;
    const tutorId = parseInt(idStr);
    
    if (isNaN(tutorId)) return NextResponse.json({ error: 'Invalid Tutor ID' }, { status: 400 });

    const body = await request.json();
    if (!body.day || !body.start || !body.end || !body.location) {
      return NextResponse.json({ error: 'Missing schedule fields' }, { status: 400 });
    }

    // Times must be 24-hour "HH:MM" — the availability math (and toMinutes)
    // assume it, so a stray "1:00" meaning 1 PM would be read as 1 AM.
    const startMin = toMinutes(body.start);
    const endMin = toMinutes(body.end);
    if (startMin === null || endMin === null) {
      return NextResponse.json(
        { error: 'Start and end must be 24-hour times in HH:MM format (e.g. 13:00).' },
        { status: 400 },
      );
    }
    if (startMin >= endMin) {
      return NextResponse.json(
        { error: 'Start time must be before end time.' },
        { status: 400 },
      );
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
