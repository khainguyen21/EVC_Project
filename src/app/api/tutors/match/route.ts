import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')?.trim()

    if (!name) {
      return NextResponse.json({ error: 'Missing name query param' }, { status: 400 })
    }

    const tutor = await prisma.tutor.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      include: { subjects: true, schedules: true },
    })

    if (!tutor) {
      return NextResponse.json({ tutor: null })
    }

    return NextResponse.json({
      tutor: {
        id: tutor.id,
        name: tutor.name,
        type: tutor.type,
        subjects: tutor.subjects.map((s) => ({ name: s.name, field: s.field })),
        schedules: tutor.schedules.map((s) => ({
          day: s.day,
          start: s.start,
          end: s.end,
          location: s.location,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/tutors/match]', error)
    return NextResponse.json({ error: 'Failed to match tutor' }, { status: 500 })
  }
}
