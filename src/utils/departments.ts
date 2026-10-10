/**
 * Every EVC department, from the course descriptions pages of the college's
 * online catalog (read October 2026), so the course reader knows the codes
 * EVC actually uses instead of guessing them.
 *
 * `code` is the prefix most of the department's courses use. `also` lists
 * other spellings: the catalog's second prefix for its C1000 course
 * (PSYC-C1000 sits in Psychology with PSYCH-012), and short forms tutors and
 * William wrote before the reader knew the catalog.
 *
 * II (Individualized Instruction) is left out on purpose. II-210 is the
 * tutoring course itself, so no tutor lists it as a subject, and the "II" in
 * "Physics II" is a numeral.
 */
export interface Department {
  code: string;
  /** As the catalog names it. */
  name: string;
  also?: string[];
  /** Every course number in the catalog, as it writes them: "001A 022 C1000". */
  courses: string;
}

export const DEPARTMENTS: Department[] = [
  {
    code: "ACCTG",
    name: "Accounting",
    also: ["ACCT"],
    courses: "001A 001B 022 030 040A 062 063 095 096A 096B 096C 097 101 138 510",
  },
  {
    code: "AJ",
    name: "Administration of Justice",
    courses: "010 011 013 014 015 019 110 111 112 113 115 116 120 123 125 139",
  },
  {
    code: "ANTH",
    name: "Anthropology",
    courses: "062 062L 063 064 066 090",
  },
  {
    code: "ART",
    name: "Art",
    courses: `012 013 014 024 025 026A 032 035 038 039 042 043 055A 055B 055C 055D 060A 060B 060C 060D
      062A 062B 066 067 068 075 076A 090 091 092 093 096 097 500 510 562`,
  },
  {
    code: "AI",
    name: "Artificial Intelligence",
    courses: "101 102 103 104 105 106 110",
  },
  {
    code: "ASTRO",
    name: "Astronomy",
    also: ["ASTR"],
    courses: "010 010L 014 016 098",
  },
  {
    code: "ATH",
    name: "Athletics",
    courses: "030 058 062 064",
  },
  {
    code: "ATHM",
    name: "Athletics Intercollegiate Men",
    courses: "060",
  },
  {
    code: "ATHW",
    name: "Athletics Intercollegiate Women",
    courses: "020 060",
  },
  {
    code: "AUTO",
    name: "Automotive Technology",
    courses: `102 103 105 106 117 118 119 120 121 122 125 127 132A 132B 132C 135 138 170 171 172 173
      181A 181B 182A 182B 182C 182D 204`,
  },
  {
    code: "BIOL",
    name: "Biology",
    also: ["BIO"],
    courses: `004A 004B 014 020 021 061 062 063 064 065 071 072 074 080A 080B 080C 080D 080E 080F 080G
      098`,
  },
  {
    code: "BIM",
    name: "Building Information Modeling",
    courses: "120 121 122 123 124 125 138",
  },
  {
    code: "BUS",
    name: "Business",
    courses: "004 006 009 060 071 082 084",
  },
  {
    code: "BIS",
    name: "Business Information Systems",
    courses: "007 011 012 016 017 039 095 101 102 104 106 109 121 135 138 160 161 162 535",
  },
  {
    code: "CHEM",
    name: "Chemistry",
    courses: "001A 001B 012A 012B 015 030A 030B",
  },
  {
    code: "COMS",
    name: "Communication Studies",
    also: ["COMM"],
    courses: "C1000 010 018 035 040 045",
  },
  {
    code: "CIT",
    name: "Computer & Information Technology",
    courses: "010 020 040 041J 043A 044 050 054 101 130A 134A",
  },
  {
    code: "CADD",
    name: "Computer Aided Design & Drafting",
    courses: "130 133 134 136A 139 140A 140B 141 142",
  },
  {
    code: "COMSC",
    name: "Computer Science",
    also: ["CS"],
    courses: "020 028 041 042 075 076 077 078 079C 080",
  },
  {
    code: "COUNS",
    name: "Counseling",
    courses: "001 012 013 014 018",
  },
  {
    code: "DANCE",
    name: "Dance",
    courses: "002 015 016 019 020 021 022 022B 022C 049 050 051 051B",
  },
  {
    code: "DLIT",
    name: "Digital Literacy",
    courses: "101 102 103 104 105 106 107 108 109 110 111 501 502 503 504 505 506 507 511",
  },
  {
    code: "ECON",
    name: "Economics",
    courses: "010A 010B",
  },
  {
    code: "EDIT",
    name: "Educational Instructional Technology",
    courses: "010 015 022 023 025 026 027 502 503 504 505",
  },
  {
    code: "ENGR",
    name: "Engineering",
    courses: "010 010A 010L 018 030 050 050L 061 066 066A 066L 069 071",
  },
  {
    code: "ENGL",
    name: "English",
    courses: "C1000 C1001 001B 028 032 052 062 072 073 080 082A 084A 084B 086A 086B 105 501L",
  },
  {
    code: "ESL",
    name: "English As a Second Language",
    courses: `350L 352 353 354 357 360L 362 363 364 367 370L 372 372L 373 374 376 377 380 380L 386 390
      390L 396 501 502 506 507 511 512 514 516 521 522 523 533 540L`,
  },
  {
    code: "ENVIR",
    name: "Environmental Science",
    courses: "010",
  },
  {
    code: "ETH",
    name: "Ethnic Studies",
    also: ["ETHN"],
    courses: "010 011 020 022 025 029 030 035 040 042 050 056 510",
  },
  {
    code: "FMT",
    name: "Facilities Management Technology",
    courses: "105 106 505 506",
  },
  {
    code: "FCS",
    name: "Family and Consumer Studies",
    courses: "019 050 070",
  },
  {
    code: "GEOG",
    name: "Geography",
    courses: "010",
  },
  {
    code: "HED",
    name: "Health Education",
    courses: "010 011",
  },
  {
    code: "HIST",
    name: "History",
    courses: "001 003A 003B 010A 010B 014 017A 017B 021 022 023 035 040 045 047",
  },
  {
    code: "HUMNT",
    name: "Humanities",
    courses: "002",
  },
  {
    code: "JOURN",
    name: "Journalism",
    courses: "010",
  },
  {
    code: "KINS",
    name: "Kinesiology",
    courses: `008A 008B 008C 009A 009B 009C 009D 012A 012B 012C 012D 022 023 025 031 033 034 037 037B
      037C 038A 038B 038C 039A 039B 039C 043 047A 047B 047C 051A 051B 051C 052A 052B 052C 052D
      053A 053B 053C 054 055 056A 056B 056C 058 060L 070A 500`,
  },
  {
    code: "LA",
    name: "Legal Assistant",
    courses: "010 014 016 033 034 036 038 040 044 046 050 071 072",
  },
  {
    code: "LIB",
    name: "Library Studies",
    courses: "015",
  },
  {
    code: "MFGT",
    name: "Manufacturing Technology",
    courses: "101 102 103 201 202 203",
  },
  {
    code: "MATH",
    name: "Mathematics",
    courses: `013 014 020 021 021L 022 025 052 061 062 066 066L 067 067L 070 071 071L 072 072L 073 078
      079`,
  },
  {
    code: "MUSIC",
    name: "Music",
    also: ["MUS"],
    courses: `010A 010B 010C 010D 011A 011B 011C 011D 020 020B 023 050A 050B 052A 052B 052C 052D 053A
      053B 083 091 093 099 180 190`,
  },
  {
    code: "NURS",
    name: "Nursing",
    courses: "010 011A 011B 012 013 014A 014B 109 119 120",
  },
  {
    code: "OCEAN",
    name: "Oceanography",
    courses: "010",
  },
  {
    code: "PHIL",
    name: "Philosophy",
    courses: "010 030 040 060 065 070 090",
  },
  {
    code: "PHOTO",
    name: "Photography",
    courses: "022 062",
  },
  {
    code: "PED",
    name: "Physical Education",
    courses: "022A 056A",
  },
  {
    code: "PHYSC",
    name: "Physical Science",
    courses: "012",
  },
  {
    // William's Fall 2026 schedule writes PHYSIC.
    code: "PHYS",
    name: "Physics",
    also: ["PHYSIC"],
    courses: "001 002A 002B 004A 007A 007B 007C",
  },
  {
    code: "POLSC",
    name: "Political Science",
    also: ["POLS"],
    courses: "C1000 002 003 004",
  },
  {
    code: "PSYCH",
    name: "Psychology",
    also: ["PSYC"],
    courses: "C1000 012 018 020 025 026 027 030 051 052 053 054 055 060 092 096 099 100 510",
  },
  {
    code: "SERV",
    name: "Service Learning",
    courses: "002",
  },
  {
    code: "SL",
    name: "Sign Language",
    courses: "001A 001B 010A 010B",
  },
  {
    code: "SOC",
    name: "Sociology",
    also: ["SOCI"],
    courses: "010 011 018 019 088",
  },
  {
    code: "SPAN",
    name: "Spanish",
    courses: "001A 001B 020A 020B 031 032 033 035 036A 036B 037A 037B 038 039",
  },
  {
    code: "STAT",
    name: "Statistics",
    also: ["STATS"],
    courses: "C1000 1000",
  },
  {
    code: "THEAT",
    name: "Theatre Arts",
    courses: "002 003 020 025A 033A 033B 033C 033D 035A 035B 035C 035D 040 050 051 052 053 060",
  },
  {
    code: "TI",
    name: "Translation and Interpretation",
    courses: "041 042 043 044 045A 045B 046A 046B 051 052 053 055 056A 056B 057A 057B",
  },
  {
    code: "VIET",
    name: "Vietnamese",
    courses: "001A 001B 091A",
  },
  {
    code: "WWT",
    name: "Water/Wastewater Technology",
    courses: "100 101 102 103 104 105 106",
  },
  {
    code: "WOMS",
    name: "Women's Studies",
    courses: "010",
  },
  {
    code: "WE",
    name: "Work Experience",
    courses: "088",
  },
];
