import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'

// Next.js Route Handlers strictly require awaiting 'params' in modern versions
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 })
    }

    // Checking if it physically exists first
    const tutor = await prisma.tutor.findUnique({
      where: { id }
    })

    if (!tutor) {
      return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })
    }

    // The actual deletion from PostgreSQL
    await prisma.tutor.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Tutor deleted successfully' })
  } catch (error) {
    console.error('[DELETE /api/tutors/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete tutor' }, { status: 500 })
  }
}
