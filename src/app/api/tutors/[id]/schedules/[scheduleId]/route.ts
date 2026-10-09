import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { markEditedOnManageStaff, touchScheduleTimestamp } from '@/lib/touchSettings'
import { requireAdmin } from '@/lib/session'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, scheduleId: string }> }
) {
  try {
    const unauthorized = await requireAdmin()
    if (unauthorized) return unauthorized
    const { scheduleId: scheduleIdStr } = await params;
    const scheduleId = parseInt(scheduleIdStr);
    
    if (isNaN(scheduleId)) return NextResponse.json({ error: 'Invalid Schedule ID' }, { status: 400 });

    const { tutorId } = await prisma.schedule.delete({
      where: { id: scheduleId }
    });

    await markEditedOnManageStaff(tutorId)
    await touchScheduleTimestamp()
    return NextResponse.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('[DELETE schedule]', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}
