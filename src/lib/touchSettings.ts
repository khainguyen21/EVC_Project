import { prisma } from '@/lib/client'

export async function touchScheduleTimestamp() {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: { scheduleLastUpdated: new Date() },
    create: { id: 1, scheduleLastUpdated: new Date() },
  })
}

// Manage Staff changed this tutor. Publish rebuilds student tutors from the
// planner, so its review screen names them (see Tutor.editedOnManageStaffAt).
export async function markEditedOnManageStaff(tutorId: number) {
  await prisma.tutor.update({
    where: { id: tutorId },
    data: { editedOnManageStaffAt: new Date() },
  })
}
