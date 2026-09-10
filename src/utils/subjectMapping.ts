import type { Tutor } from "../types";

/**
 * Maps individual subject strings to their field/category
 * Used to group tutors by subject area
 * Example: "COMSC 075" → "Computer Science"
 */
export function getFieldFromSubject(subject: string): string {
  const upperSubject = subject.toUpperCase();

  if (upperSubject.includes('ACCOUNTING')) return 'Accounting';
  
  if (upperSubject.includes('ART')) return 'Art';

  if (upperSubject.includes('BIO') || upperSubject === 'BIOLOGY') return 'Biology';

  if (upperSubject.includes('BUS') || upperSubject.includes('BIS')) return 'Business';
  
  if (upperSubject.includes('CHEM')) return 'Chemistry';
  
  if (upperSubject.includes('COMSC') || upperSubject === 'COMPUTER SCIENCE') return 'Computer Science';
  
  if (
    upperSubject.includes('MATH') || 
    upperSubject === 'MATHEMATICS' || 
    upperSubject.includes('STAT')
  ) return 'Math';
  
  if (upperSubject.includes('ENGLISH') || upperSubject === 'ESL') return 'English';
  
  if (upperSubject.includes('ETH')) return 'Ethnic Studies';
  
  if (upperSubject === 'PHYSICS' || upperSubject.includes('PHYSIC')) return 'Physics';
  
  if (upperSubject.includes('HISTORY')) return 'History';
  
  if (upperSubject.includes('PSYCHOLOGY')) return 'Psychology';
  
  if (upperSubject === 'SPANISH') return 'Spanish';

  if (upperSubject.includes('SOC')) return 'Sociology';
  
  if (upperSubject === 'MUSIC') return 'Music';
  
  if (upperSubject === 'VIETNAMESE') return 'Vietnamese';
  
  if (upperSubject.includes('OPEN COMPUTER LAB')) return 'Open Computer Lab';

  return subject;
}
// getFieldFromSubject("COMSC 075")        // → "Computer Science"
// getFieldFromSubject("Math 1A")          // → "Math"
// getFieldFromSubject("STAT C1000")       // → "Math"
// getFieldFromSubject("BIO 020")          // → "Biology"


/**
 * Get all unique fields from a list of subjects
 * Example: ["CHEM 015", "CHEM 30A", "MATH 020", "MATH 021"] → ["Chemistry", "Math"]
*/
export function getUniqueFields(subjects: string[]): string[] {
    const fields = subjects.map(getFieldFromSubject);
    return Array.from(new Set(fields));
}
// const ngocLeSubjects = ["CHEM 015", "CHEM 30A", "MATH 020", "MATH 021"];
// getUniqueFields(ngocLeSubjects); → ["Chemistry", "Math"]


/**
 * Filter subjects that belong to a specific field
 * Example: ["CHEM 015", "CHEM 30A", "MATH 020", "MATH 021"] → ["CHEM 015", "CHEM 30A"]
 */
export function filterSubjectsByField(subjects: string[], field: string): string[] {
  return subjects.filter(subject => getFieldFromSubject(subject) === field);
}

// const ngocLeSubjects = ["CHEM 015", "CHEM 30A", "MATH 020", "MATH 021"];
// filterSubjectsByField(ngocLeSubjects, "Chemistry"); → ["CHEM 015", "CHEM 30A"]

/**
 * Sort tutors by type priority: professors first, then staff, then regular tutors
 * Example: [regular, professor, staff] → [professor, staff, regular]
 */
export function sortTutorsByType(tutors: Tutor[]): Tutor[] {
   //Using [...tutors] creates a copy, keeping the original unchanged
   //This prevents unexpected bugs elsewhere in your code
    return [...tutors].sort((a, b) => {
        const getPriority = (tutor: Tutor) => {
          if (tutor.type === 'professor') return 1;
          if (tutor.type === 'staff') return 2;
          return 3;
        }

        return getPriority(a) - getPriority(b);
    })
}

/**
 * Sort subjects alphabetically
 * Example: ["Math", "Computer Science", "Physics"] → ["Computer Science", "Math", "Physics"]
 */
export function sortSubjectAlphabetically(subjects: string[]) {
    return [...subjects].sort((a, b) => {
      if (a.toLowerCase() < b.toLowerCase()) return -1;
      if (a.toLowerCase() > b.toLowerCase()) return 1;
      return 0;
    })
}