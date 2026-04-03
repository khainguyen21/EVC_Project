import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'
import scheduleData from '../public/data/schedule.json'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

interface ScheduleEntry {
  day: string
  startTime: string
  endTime: string
  location: string
}

interface TutorEntry {
  name: string
  type?: string
  role?: string
  subjects: string[]
  schedule: ScheduleEntry[]
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data in order (children first)
  await prisma.schedule.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.tutor.deleteMany()

  const tutors = (scheduleData as { tutors: TutorEntry[] }).tutors

  for (const tutorData of tutors) {
    const tutor = await prisma.tutor.create({
      data: {
        name: tutorData.name,
        type: tutorData.type ?? 'tutor',
        subjects: {
          create: tutorData.subjects.map((subjectName: string) => ({
            name: subjectName,
            field: inferField(subjectName),
          })),
        },
        schedules: {
          create: tutorData.schedule.map((s: ScheduleEntry) => ({
            day: s.day,
            start: s.startTime,
            end: s.endTime,
            location: s.location,
          })),
        },
      },
    })
    console.log(`  ✅ Created tutor: ${tutor.name}`)
  }

  console.log('✨ Seeding complete!')
}

function inferField(subjectName: string): string {
  const name = subjectName.toUpperCase()
  if (name.includes('BIOL') || name.includes('BIOLOGY')) return 'Biology'
  if (name.includes('CHEM') || name.includes('CHEMISTRY')) return 'Chemistry'
  if (name.includes('MATH') || name.includes('MATHEMATICS')) return 'Mathematics'
  if (name.includes('COMSC') || name.includes('COMPUTER')) return 'Computer Science'
  if (name.includes('PHYSICS') || name.includes('ASTRONOMY')) return 'Physics'
  if (name.includes('ENGLISH') || name.includes('ESL')) return 'English'
  if (name.includes('ACCOUNTING') || name.includes('BUS') || name.includes('BIS')) return 'Business'
  if (name.includes('ART')) return 'Art'
  if (name.includes('SOCIOLOGY') || name.includes('ETHNIC') || name.includes('HISTORY') || name.includes('PSYCHOLOGY')) return 'Social Sciences'
  if (name.includes('SPANISH') || name.includes('VIETNAMESE')) return 'Languages'
  if (name.includes('OPEN COMPUTER LAB')) return 'Open Lab'
  return 'General'
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
