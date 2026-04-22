import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { z } from 'zod'

const updateTutorSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  type: z.enum(['tutor', 'professor', 'staff'], {
    errorMap: () => ({ message: 'Type must be tutor, professor, or staff' }),
  }),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const tutor = await prisma.tutor.findUnique({
      where: { id },
      include: {
        subjects: true,
        schedules: true
      }
    })

    if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 })

    return NextResponse.json({ tutor })
  } catch (error) {
    console.error('[GET /api/tutors/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch tutor' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await request.json()

    const validation = updateTutorSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    const updatedTutor = await prisma.tutor.update({
      where: { id },
      data: {
        name: validation.data.name,
        type: validation.data.type,
      }
    })

    return NextResponse.json({ tutor: updatedTutor })
  } catch (error) {
    console.error('[PUT /api/tutors/[id]]', error)
    return NextResponse.json({ error: 'Failed to update tutor' }, { status: 500 })
  }
}


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
