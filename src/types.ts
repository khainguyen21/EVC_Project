export type Location = string;

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | '';

export interface ScheduleEntry {
    day: Day,
    startTime: string,
    endTime: string,
    // Raw 24-hour times ("14:00") from the API — used for "available now" math.
    // Optional because admin pages build entries without them.
    start?: string,
    end?: string,
    location: Location
}

export interface Tutor {
    id?: number,
    name: string, 
    subjects: { name: string, field: string }[],
    fields?: string[],
    schedule: ScheduleEntry[], 
    type?: 'professor' | 'staff' | 'tutor'
}

export interface ScheduleData {
    tutors: Tutor[]
}

// Dates are plain "YYYY-MM-DD" calendar strings in campus time, so the client
// never has to reason about timezones when comparing them.
export interface Holiday {
    id: number,
    name: string, // e.g. "Labor Day"
    date: string
}

export interface Term {
    id: number,
    name: string, // e.g. "Fall 2026"
    startDate: string,
    endDate: string,
    isActive: boolean,
    holidays: Holiday[]
}
// What the admin Terms page sees: a Term plus the private availability-form
// state. Kept out of Term so the public /api/term never carries the code.
export interface AdminTerm extends Term {
    availabilityCode: string | null,
    submissionCount: number
}

export interface Submission {
    id: number,
    termId: number,
    name: string,
    studentId: string,
    email: string,
    units: number,
    trainingDone: boolean,
    subjectsRaw: string,
    subjectCodes: string[],
    availability: { day: Day, allDay: boolean, start: string, end: string }[],
    notes: string | null,
    status: 'pending' | 'approved' | 'declined',
    resubmittedAt: string | null,
    createdAt: string,
    updatedAt: string,
    flags: ('under-units' | 'subjects-need-review')[]
}
