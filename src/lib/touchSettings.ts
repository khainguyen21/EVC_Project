import { prisma } from '@/lib/client'

export async function touchScheduleTimestamp() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { scheduleLastUpdated: new Date() },
    create: { id: 1, scheduleLastUpdated: new Date() },
  })
}
