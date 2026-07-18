import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const PROMPT = `You are parsing tutor recruitment email replies for a college tutoring center.

Each reply follows this format:
  Tutor name and ID number = [name], ID [number]
  Subjects tutored = [subject list]
  [Season] weekly availability = [day/time ranges]
  Units = [units info]

Extract every tutor from the text. Rules:
- "type" is always "tutor"
- Map subject course codes to academic fields:
  Math/MATH → Mathematics, Psych/PSYCH → Psychology, Biol/BIOL → Biology,
  Mus/MUS → Music, Comsc/COMSC → Computer Science, Chem/CHEM → Chemistry,
  Phys/PHYS → Physics, Eng/ENGL → English, Hist/HIST → History,
  Art/ART → Art, Bus/BUS → Business, Acct/ACCT → Accounting,
  Astro/ASTR → Astronomy, Span/SPAN → Spanish, Viet/VIET → Vietnamese,
  Socio/SOCI → Sociology, Ethst/ETHN → Ethnic Studies
- Group subjects that share the same department prefix into a single entry. Format: "PREFIX-NUM1, NUM2, NUM3" (e.g., COMSC-075, COMSC-076, COMSC-028 → "COMSC-075, 076, 028" with field "Computer Science"). If only one subject for a prefix, keep as-is (e.g., "MATH-021")
- Expand combined days: "Mon/Wed 9am-6pm" becomes two schedule entries (Monday and Wednesday, same times)
- Convert times to 24-hour HH:MM format (e.g., "9am" → "09:00", "6pm" → "18:00", "12pm" → "12:00")
- Extract location from the email if provided (e.g. "Location = LE-237" or "Location = MS-112"); valid values are "LE-237", "MS-112", "SQ-231", "Online"; default to "Online" only if no location is mentioned
- Skip any availability entry that says "all day available" with no specific times
- If the text contains multiple replies separated by blank lines or "---", extract all of them

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

    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No email text provided." },
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
      model: "gemini-2.5-flash-lite",
      contents: `${PROMPT}\n\nEmail replies to parse:\n\n${text}`,
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
    console.error("parse-emails error:", err);
    return NextResponse.json(
      { error: "Failed to parse email replies." },
      { status: 500 },
    );
  }
}
