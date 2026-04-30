import { NextResponse } from 'next/server'
import { prisma } from '@/lib/client'

export async function GET() {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, scheduleLastUpdated: new Date() },
    })
    return NextResponse.json({ scheduleLastUpdated: settings.scheduleLastUpdated })
  } catch (error) {
    console.error('[GET /api/settings]', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
