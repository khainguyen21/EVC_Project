import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'

export async function GET() {
  try {
    const tutors = await prisma.tutor.findMany({
      include: {
        subjects: true,
        schedules: true,
      },
      orderBy: { name: 'asc' },
    })

    // Transform DB shape → the shape page.tsx already expects
    const formatted = tutors.map((tutor) => ({
      name: tutor.name,
      type: tutor.type === 'professor' ? 'professor' : undefined,
      role: tutor.role ?? undefined,
      subjects: tutor.subjects.map((s) => s.name),
      schedule: tutor.schedules.map((s) => ({
        day: s.day,
        startTime: s.start,
        endTime: s.end,
        location: s.location,
      })),
    }))

    return NextResponse.json({ tutors: formatted })
  } catch (error) {
    console.error('[GET /api/tutors]', error)
    return NextResponse.json(
      { error: 'Failed to fetch tutors' },
      { status: 500 }
    )
  }
}
