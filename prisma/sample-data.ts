import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma'
import type { Weekday } from '../src/utils/centerHours'
import {
  submissionSchema,
  toSubmissionData,
  type SubmissionStatus,
} from '../src/utils/submission'

// Made-up tutors for building and trying the shift planner. Only the test
// database's .env may set ALLOW_SAMPLE_DATA, so this can never fill the live one.
if (process.env.ALLOW_SAMPLE_DATA !== 'true') {
  console.error(
    '❌ Refusing to run: add ALLOW_SAMPLE_DATA=true to .env first, and only in the test database\'s .env.',
  )
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const TERM_NAME = 'Sample Term'
const FORM_CODE = 'sample-form'

interface SampleTutor {
  name: string
  units: number
  subjects: string
  // A day without times is "all day".
  availability: { day: Weekday; start?: string; end?: string }[]
  notes?: string
  trainingDone?: boolean
  status: SubmissionStatus
  resubmitted?: boolean
}

const tutors: SampleTutor[] = [
  // MS-112
  {
    name: 'Alex Rivera',
    units: 12,
    subjects: 'Math 71, 72, Stat C1000',
    availability: [
      { day: 'Monday' },
      { day: 'Wednesday', start: '09:00', end: '13:00' },
      { day: 'Friday', start: '09:00', end: '12:00' },
    ],
    notes: 'Prefer mornings if possible.',
    status: 'approved',
  },
  {
    name: 'Priya Shah',
    units: 9,
    subjects: 'Stat C1000',
    availability: [
      { day: 'Tuesday', start: '13:00', end: '20:00' },
      { day: 'Thursday', start: '13:00', end: '20:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Daniel Kim',
    units: 15,
    subjects: 'Chem 1A, Chem 1B, Chem 30A',
    availability: [
      { day: 'Monday', start: '10:00', end: '14:00' },
      { day: 'Wednesday', start: '10:00', end: '14:00' },
      { day: 'Friday', start: '10:00', end: '14:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Linh Pham',
    units: 12,
    subjects: 'COMSC 75, 76, 110',
    availability: [
      { day: 'Tuesday', start: '09:00', end: '12:00' },
      { day: 'Tuesday', start: '15:00', end: '18:00' },
      { day: 'Thursday', start: '09:00', end: '12:00' },
    ],
    notes: 'I have a lab on Tuesdays from 12 to 3.',
    status: 'approved',
  },
  {
    name: 'Marcus Johnson',
    units: 13,
    subjects: 'Physics 4A, 4B, Math 71',
    availability: [
      { day: 'Monday', start: '14:00', end: '18:00' },
      { day: 'Wednesday', start: '14:00', end: '18:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Sofia Hernandez',
    units: 10,
    subjects: 'Math 20, 21, 22, 25, 62, 66, 71',
    availability: [{ day: 'Tuesday' }, { day: 'Thursday' }],
    status: 'approved',
  },
  {
    name: 'Kevin Tran',
    units: 12,
    subjects: 'Math 71, 72, 73',
    availability: [
      { day: 'Monday', start: '09:00', end: '12:00' },
      { day: 'Wednesday', start: '09:00', end: '12:00' },
      { day: 'Friday' },
    ],
    status: 'approved',
  },
  {
    name: 'Hana Sato',
    units: 11,
    subjects: 'Engineering 10, Astronomy 10',
    availability: [
      { day: 'Wednesday', start: '12:00', end: '18:00' },
      { day: 'Thursday', start: '16:00', end: '20:00' },
    ],
    status: 'approved',
  },

  // SQ-231
  {
    name: 'Grace Okafor',
    units: 14,
    subjects: 'BIOL 71, 72, 74',
    availability: [
      { day: 'Monday', start: '09:00', end: '13:00' },
      { day: 'Tuesday', start: '09:00', end: '13:00' },
      { day: 'Thursday', start: '09:00', end: '13:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Tommy Vo',
    units: 6,
    subjects: 'Biology 71',
    availability: [
      { day: 'Wednesday' },
      { day: 'Friday', start: '09:00', end: '13:00' },
    ],
    status: 'approved',
  },

  // LE-237
  {
    name: 'Emily Chen',
    units: 12,
    subjects: 'English 1A, 1B, 1C',
    availability: [
      { day: 'Monday', start: '12:00', end: '18:00' },
      { day: 'Wednesday', start: '12:00', end: '18:00' },
    ],
    notes: 'I can\'t work after 6 on any day.',
    status: 'approved',
  },
  {
    name: 'Jorge Ramirez',
    units: 9,
    subjects: 'ESL',
    availability: [
      { day: 'Tuesday', start: '09:00', end: '14:00' },
      { day: 'Thursday', start: '09:00', end: '14:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Aisha Malik',
    units: 12,
    subjects: 'Accounting 1A, 1B, Business 71',
    availability: [
      { day: 'Monday', start: '09:00', end: '12:00' },
      { day: 'Tuesday', start: '17:00', end: '20:00' },
      { day: 'Thursday', start: '17:00', end: '20:00' },
    ],
    status: 'approved',
  },
  {
    name: 'Noah Williams',
    units: 8,
    subjects: 'Open Computer Lab',
    availability: [{ day: 'Monday' }, { day: 'Tuesday' }, { day: 'Wednesday' }],
    status: 'approved',
  },
  {
    name: 'Camila Torres',
    units: 12,
    subjects: 'Psychology 1, Spanish 1A',
    availability: [
      { day: 'Wednesday', start: '09:00', end: '12:00' },
      { day: 'Friday' },
    ],
    status: 'approved',
  },
  {
    name: 'Bao Nguyen',
    units: 7,
    subjects: 'Vietnamese 1A, English 1A',
    availability: [
      { day: 'Tuesday', start: '12:00', end: '16:00' },
      { day: 'Thursday', start: '12:00', end: '16:00' },
    ],
    status: 'approved',
  },

  // VPA-109/111
  {
    name: 'Lucas Moreau',
    units: 12,
    subjects: 'Music 1A, 2A',
    availability: [
      { day: 'Monday', start: '13:00', end: '17:00' },
      { day: 'Wednesday', start: '13:00', end: '17:00' },
    ],
    status: 'approved',
  },

  // Subjects in three buildings: SQ, MS and LE.
  {
    name: 'Mai Le',
    units: 15,
    subjects: 'Biology 71, Chemistry 1A, English 1A',
    availability: [
      { day: 'Monday', start: '09:00', end: '15:00' },
      { day: 'Tuesday', start: '09:00', end: '15:00' },
      { day: 'Wednesday', start: '09:00', end: '15:00' },
      { day: 'Thursday', start: '09:00', end: '15:00' },
    ],
    notes: 'Happy to work in any building.',
    status: 'approved',
  },

  // Names no course, so the inbox says "Subjects need review".
  {
    name: 'Ryan Brooks',
    units: 12,
    subjects: 'Calculus and anatomy',
    availability: [
      { day: 'Tuesday', start: '14:00', end: '18:00' },
      { day: 'Thursday', start: '14:00', end: '18:00' },
    ],
    status: 'approved',
  },

  // Not on the planner: still pending, or declined.
  {
    name: 'Olivia Park',
    units: 4.5,
    subjects: 'Math 71',
    availability: [{ day: 'Monday', start: '09:00', end: '12:00' }],
    status: 'pending',
  },
  {
    name: 'Isabella Cruz',
    units: 12,
    subjects: 'English 1A',
    availability: [{ day: 'Friday', start: '09:00', end: '13:00' }],
    trainingDone: false,
    status: 'pending',
    resubmitted: true,
  },
  {
    name: 'Jason Lee',
    units: 12,
    subjects: 'Math 71, Stat C1000',
    availability: [{ day: 'Monday' }],
    status: 'declined',
  },
]

async function main() {
  console.log('🌱 Adding sample data...')

  // Its submissions and holidays go with it (onDelete: Cascade).
  await prisma.term.deleteMany({ where: { name: TERM_NAME } })

  const term = await prisma.term.create({
    data: {
      name: TERM_NAME,
      startDate: new Date('2027-01-26'),
      endDate: new Date('2027-05-28'),
      availabilityCode: FORM_CODE,
    },
  })

  const now = new Date()
  await prisma.availabilitySubmission.createMany({
    data: tutors.map((t, i) => {
      const input = submissionSchema.parse({
        name: t.name,
        studentId: String(9100001 + i),
        email: `${t.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        units: t.units,
        trainingDone: t.trainingDone ?? true,
        subjects: t.subjects,
        availability: t.availability.map((a) => ({
          day: a.day,
          allDay: !a.start,
          start: a.start ?? '',
          end: a.end ?? '',
        })),
        notes: t.notes,
      })
      return {
        ...toSubmissionData(input),
        termId: term.id,
        studentId: input.studentId,
        status: t.status,
        resubmittedAt: t.resubmitted ? now : null,
      }
    }),
  })

  const count = (s: SubmissionStatus) => tutors.filter((t) => t.status === s).length
  console.log(
    `✨ "${TERM_NAME}": ${count('approved')} approved, ${count('pending')} pending, ${count('declined')} declined.`,
  )
  console.log(`   Form link: /availability?code=${FORM_CODE}`)
}

main()
  .catch((e) => {
    console.error('❌ Sample data failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
