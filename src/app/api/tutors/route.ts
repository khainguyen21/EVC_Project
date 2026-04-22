import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'
import { z } from 'zod'

const createTutorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['tutor', 'professor', 'staff']),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort')

    const tutors = await prisma.tutor.findMany({
      include: {
        subjects: true,
        schedules: true,
      },
      orderBy: sort === 'recent' ? { createdAt: 'desc' } : { name: 'asc' },
    })

    // Transform DB shape → the shape page.tsx already expects
    const formatted = tutors.map((tutor) => ({
      id: tutor.id,
      name: tutor.name,
      type: tutor.type,
      subjects: tutor.subjects.map((s) => ({ name: s.name, field: s.field })),
      fields: Array.from(new Set(tutor.subjects.map((s) => s.field))),
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validation = createTutorSchema.safeParse(body)
    
    if (!validation.success) {
      // 400 Bad Request if the JSON doesn't match our Zod schema
      return NextResponse.json({ error: validation.error.format() }, { status: 400 })
    }

    // Insert into Postgres!
    const newTutor = await prisma.tutor.create({
      data: {
        name: validation.data.name,
        type: validation.data.type,
      }
    })

    return NextResponse.json({ tutor: newTutor }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/tutors]', error)
    return NextResponse.json({ error: 'Failed to create tutor' }, { status: 500 })
  }
}
