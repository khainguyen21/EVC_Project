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