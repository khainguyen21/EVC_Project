export type Location = string;

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | '';

export interface ScheduleEntry {
    day: Day, 
    startTime: string, 
    endTime: string, 
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