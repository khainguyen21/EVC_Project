import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { touchScheduleTimestamp } from '@/lib/touchSettings'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, scheduleId: string }> }
) {
  try {
    const { scheduleId: scheduleIdStr } = await params;
    const scheduleId = parseInt(scheduleIdStr);
    
    if (isNaN(scheduleId)) return NextResponse.json({ error: 'Invalid Schedule ID' }, { status: 400 });

    await prisma.schedule.delete({
      where: { id: scheduleId }
    });

    await touchScheduleTimestamp()
    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('[DELETE schedule]', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
