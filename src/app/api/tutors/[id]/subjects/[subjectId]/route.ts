import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { touchScheduleTimestamp } from '@/lib/touchSettings'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, subjectId: string }> }
) {
  try {
    const { subjectId: subjectIdStr } = await params;
    const subjectId = parseInt(subjectIdStr);
    
    if (isNaN(subjectId)) return NextResponse.json({ error: 'Invalid Subject ID' }, { status: 400 });

    await prisma.subject.delete({
      where: { id: subjectId }
    });

    await touchScheduleTimestamp()
    return NextResponse.json({ message: 'Subject unassigned successfully' });
  } catch (error) {
    console.error('[DELETE subject]', error);
    return NextResponse.json({ error: 'Failed to modify subject' }, { status: 500 });
  }
}
