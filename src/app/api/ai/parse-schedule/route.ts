import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const PROMPT = `You are reading a printed tutoring-center schedule for a college (EVC).

The document is organized by ACADEMIC FIELD. Each field appears as a heading (e.g. "Business", "Chemistry", "Economics", "English", "English as a Second Language", "History"). Under each field heading are one or more entries shaped like:

  [Tutor Name], [subject / course codes]
    • [Days] [start time]-[end time]pm/am (in [LOCATION])

Example:
  Business
  Ngoc Ha, Business 71, 82
    • Tues/Wed 2:00-3:00pm (in LE-237)

Extract every tutor and their shifts. Rules:
- "type" is always "tutor".
- The field heading directly above an entry is the academic "field" for that entry's subject. For "English as a Second Language" use field "ESL" and subject name "ESL".
- Build the subject "name" from the text after the tutor's name, kept as written and grouped on one line. Examples: "Business 71, 82" -> name "Business 71, 82" field "Business"; "Chem 15" -> name "Chem 15" field "Chemistry"; "Econ 10A" -> name "Econ 10A" field "Economics"; "English C1000, C1001" -> name "English C1000, C1001" field "English"; "History 17A/B" -> name "History 17A/B" field "History".
- THE SAME PERSON MAY APPEAR UNDER MULTIPLE FIELDS. Merge them into ONE tutor object (match by name, case-insensitive). Combine all their subjects (one subject entry per line/field) and all their schedule shifts. NEVER output duplicate tutor objects for the same name.
- Expand combined days into separate schedule entries:
  - "Tues/Wed" -> Tuesday and Wednesday
  - "Mon/Tues" -> Monday and Tuesday
  - "Mon, Tues, Wed, Thurs" -> Monday, Tuesday, Wednesday, Thursday
  Abbreviation map: Mon->Monday, Tue/Tues->Tuesday, Wed->Wednesday, Thu/Thurs->Thursday, Fri->Friday.
- Each expanded day shares the same start, end, and location as its line.
- Convert times to 24-hour HH:MM. The am/pm at the end of a range applies to both sides when sensible. Examples: "2:00-3:00pm" -> "14:00"-"15:00"; "9:00am-2:00pm" -> "09:00"-"14:00"; "1:30pm-5:30pm" -> "13:30"-"17:30"; "2:00-4:00pm" -> "14:00"-"16:00".
- Location is the text after "in " inside the parentheses. Valid values: "LE-237", "MS-112", "SQ-231", "Online". If the parenthetical has extra notes (e.g. "in LE-237, Library building"), use only the room code "LE-237". If no location is given, use "Online".
- Do NOT treat field headings as tutors.

Return ONLY valid JSON matching this exact schema:
{
  "tutors": [
    {
      "name": "string",
      "type": "tutor",
      "subjects": [{ "name": "string", "field": "string" }],
      "schedules": [{ "day": "string", "start": "string", "end": "string", "location": "string" }]
    }
  ]
}`;

export async function POST(request: Request) {
  try {
    // Only logged-in admins may hit this endpoint — it spends Gemini API quota
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image, mimeType } = await request.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "No image provided." },
        { status: 400 },
      );
    }

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ];
    if (!mimeType || !allowed.includes(mimeType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PNG, JPEG, WebP, or PDF." },
        { status: 400 },
      );
    }

    if (
      !process.env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY === "your-gemini-api-key-here"
    ) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: [{ text: PROMPT }, { inlineData: { mimeType, data: image } }],
      config: { responseMimeType: "application/json" },
    });

    const raw = response.text ?? "";
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.tutors)) {
      return NextResponse.json(
        { error: "Unexpected response from AI." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("parse-schedule error:", err);
    return NextResponse.json(
      { error: "Failed to read the schedule image." },
      { status: 500 },
    );
  }
}
