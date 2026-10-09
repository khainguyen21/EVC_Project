# Roadmap

What comes after the tutor availability form ([PR #2](https://github.com/khainguyen21/EVC_Project/pull/2)).

There are four features. Each one gets its own branch and pull request, built in this order:

1. [Shift planner](#1-shift-planner)
2. [Confirmation email](#2-confirmation-email)
3. [Print / Save as PDF](#3-print--save-as-pdf)
4. [Publish to the public schedule](#4-publish-to-the-public-schedule)

The planner comes first because the Spring form link doesn't go out until around December. The email has to be live before that link goes out, so by the start of December. Print can move up if the EVC website team needs a PDF sooner.

Each section lists what is **decided**, what is **waiting on William**, and anything **later**.

> This repo is public. Keep private details out of it, such as the weekly hours William aims to give each tutor. Those belong in admin settings stored in the database.

---

## 1. Shift planner

Branch: `feature/shift-planner`

William places approved tutors' shifts into buildings, one day at a time. It is based on layout B of the prototype ("Room board"), which William preferred.

### Decided

**Layout**
- A "Shift Planner" page in the admin sidebar, under Tutor Availability. It opens on the same term the inbox would.
- William plans one repeating Monday-to-Friday week per term, like the public schedule. Holidays stay on the Terms page.
- One column per building, time running down the page, one day at a time.
- Tutors free that day are listed on the left as cards. William drags a card into a building at the time the shift should start.
- Shifts start, end, and move in 15-minute steps (9:00, 9:15, 9:30, 9:45). The tutor form uses the same 15-minute steps, since real shifts start at times like 9:15 and 1:45.
- A few shifts end at times like 12:10 or 1:40, between classes. Those tutors round inward on the form (until 12:00) and write the exact time in Notes, which William sees on their card. William can still type the exact time on Manage Staff. (Khai's call while William was unavailable. Mention it to him; 5-minute steps are a small change if he wants them.)
- A dropped shift is 3 hours by default (William's usual shifts are 9–12 or 1–4), shortened to fit the tutor's free time but never below 1 hour. Drag its top or bottom edge to change when it starts or ends, with a 1-hour minimum. (William asked for the top edge after trying it.)
- There is no daily limit. The 3 hours is only where a new shift starts; a tutor's week is kept in check by the usual hours and the 20-hour limit (see Hours).
- A tutor can have more than one shift in a day (split shifts), but can't be in two places at the same time. Shifts in different buildings can touch; no walking time is needed between them.
- Each card shows the tutor's notes from the form.
- Each card lists the tutor's courses shortened the way William types them: `MATH 20-25, 62, 66-67, 71-72, 79` instead of every course spelled out.
- Computer only. On a phone, the planner page says to open it on a computer.

**Who shows up**
- Approved submissions for the selected term.
- If a tutor resubmits after William has placed them, their status goes back to pending, but they stay on the board with an "availability changed" badge. William can still move and add their shifts. Any shift that no longer fits their new hours turns red. Nothing is deleted automatically. The badge clears once William approves them again.
- If William declines or deletes a tutor who has shifts, the inbox asks first ("Maria has 3 planned shifts. Declining removes them."), then removes the shifts.
- A tutor whose subjects couldn't be read ("Subjects need review" in the inbox) shows a note to fix their subjects in the inbox. Until then, no building lights up for them and they add no coverage.

**Buildings follow subjects**

| Building | Subjects |
| --- | --- |
| MS-112 | Astronomy, Chemistry, Computer Science, Engineering, Math (including Stat), Physics |
| SQ-231 | Biology only |
| VPA-109/111 | Music |
| LE-237 | Everything else: Accounting, Business, English, ESL, Open Computer Lab, Psychology, Spanish, Vietnamese, … |

- "Open Computer Lab" is not a course code, so the planner recognizes it by name and puts it in LE.
- While William drags a tutor, the buildings that match their subjects light up.
- Dropping a tutor into another building is allowed, with a warning. William has the final say.

**Coverage, per building, every 15 minutes**
- MS and LE: the goal is 2 tutors during the day; 1 is acceptable. After 5 pm the goal is 1, because it's slower and MSRC staff are there with the tutor.
- MS must always have a Calc tutor (MATH 66, 67, 71, 72, 73, 78 or 79) and a Stats tutor (STAT C1000). A missing one is the strongest warning. After 5 pm, one tutor who covers Calc or Stats is enough. "Any Math" and the old MATH 63 don't count as Stats. Chemistry and Physics are nice to have through the day, so a gap there is a lighter warning.
- SQ: the goal is 1 tutor. Usually one Biology tutor at a time, sometimes two overlapping.
- VPA: William runs it too. 1 tutor, since Music isn't in high demand.
- Coverage only counts while a building is open.
- Coverage counts the fewest tutors who between them cover every course offered there at that time. Calc with Stat counts as 2. Two tutors who both only do MATH-071 count as 1.
- The second tutor is there to cover more subjects, not to shorten the wait. Two tutors with the same courses count as 1.
- A tutor gets a "same subjects" warning when everything they cover, someone else there already covers. A tutor for "any Chemistry" covers every numbered Chemistry course.
- A tutor counts only for their courses that belong to that building. A Chemistry and English tutor placed in MS counts for Chemistry only. A tutor with no courses for that building gets the warning and doesn't count toward it.
- Tutors with subjects in more than one building usually work in only one place, and William picks which. The form doesn't ask them to choose. For example, a Stats and English tutor may work only in LE when MS already has enough Stats tutors. Helping a student with Stats there is fine, but it doesn't count toward coverage.
- Each building has its own hours, and they change from term to term, so they are stored per term in the database, not in the code. A new term starts from the last term's hours. Fall 2026:

  | Building | Mon | Tue | Wed | Thu | Fri |
  | --- | --- | --- | --- | --- | --- |
  | MS-112 | 8 am–6 pm | 8 am–8 pm | 8 am–8 pm | 8 am–8 pm | 8 am–5 pm |
  | LE-237 | 9 am–5 pm | 9 am–5 pm | 9 am–5 pm | 9 am–5 pm | 9 am–1 pm |
  | SQ-231 | 9 am–4 pm | 9 am–3 pm | 9 am–3 pm | 9 am–3 pm | 9 am–1 pm |
  | VPA-109/111 | 11 am–3 pm | 11 am–3 pm | 11 am–3 pm | 11 am–3 pm | 11 am–3 pm |

  William confirmed MS, LE (Tue–Thu from the EVC site) and SQ. VPA is Khai's guess, kept for now.
- William edits the hours on the Terms page. The rules page shows MS-112's hours, since it is the MSRC's page.
- The form offers the same times every weekday: from the week's earliest opening to its latest closing (8 am–8 pm in Fall 2026), even on a day when every building closes earlier. William wants each tutor's full availability, not only the hours that fit a building that day (he asked for this after trying it). "All day" means that whole span. The planner still counts coverage only while a building is open.
- Tutor shifts can start when a building opens, so MS shifts can start at 8 am.
- Hovering the coverage strip lists the courses covered at that time.
- Only the student tutors William places count. Staff and professor hours don't count toward coverage (William confirmed), and they are not shown in the first version.
- These are warnings. The planner never blocks William.

**Hours**
- Each card shows the tutor's total hours this week, across all days.
- William aims to give each tutor a fair share of hours each week, his "usual hours". It is a range, a minimum and a maximum per week, because he thinks of fair hours as a range. It is a planner setting, stored in the database rather than the code.
- The usual hours have no starting value in the code. William types his range once on the planner page.
- Cards show where each tutor's week stands: gray below the range, green inside it (both ends included), amber above it. Until William sets the range, cards only change color at 20 hours.
- Only student tutors fill out the availability form, so everyone in the planner is a student tutor. They turn red at 20 hours a week; exactly 20 is already red.
- When William opens a day, the tutor list sorts the fewest hours to the top, so nobody gets forgotten. The cards then keep their places while he works on that day, and sort again when he switches days. (Before this, a card jumped down the list after a drop, which looked to William as if the tutor had left it.)
- The top of each building's column shows its total planned hours for the week. William keeps track of the budget himself; the planner doesn't enforce one.
- A "Week" tab, after Monday to Friday, lists every tutor with their hours each day and their weekly total, colored like the cards. The bottom row totals each day and the whole week, for the budget. Clicking a day's hours opens that day. (William asked for this after trying it.)

**Outside availability**
- William can place a shift outside the hours a tutor sent. It gets a clear "outside their availability" warning.

**Saving**
- Every change saves as William goes, in its own table, separate from the public schedule.
- Undo (button, or Ctrl+Z / Cmd+Z) for the last 20 changes while the page is open.
- Nothing on the public site changes until Publish (feature 4).

**Not in the first version**
- Copying one day to another ("Wednesday same as Monday"). This is the first thing to add afterward.
- Approving tutors from inside the planner. William keeps using the inbox.
- A separate login for the Biology supervisor. William hires every tutor, Biology included. The Biology supervisor schedules the Biology tutors and sends William the schedule, and William enters it on the master schedule. So William is the only one using the planner.
- Showing staff and professor hours.
- Online or Zoom shifts. Everyone works in a building for now (William, October 2026).
- Must-have courses outside MS. LE has none (William confirmed).

**How it's built**
- One branch with small commits, and one pull request after William has tried it.
- Tests for the rules (coverage, "adds a new course", hour totals, fitting a shift into free time, shortening course lists) are written before the code. Dragging is checked in the browser.
- The course reader must accept subject lists the way they appear in William's Fall 2026 schedule, including `MATH020` with no space and his spelling `PHYSIC`. Both are flagged "subjects need review" today, which leaves those tutors out of coverage.
- William asked for unusual subjects to be read or double-checked. "Math Any" already reads as any Math course. The reader also accepts "Stats" as STAT. A part with words it can't use ("Math 20 and up", "any math up to Calc") gets the double-check warning instead of being quietly read as something else. "Calc" and "Precalc" aren't matched to course numbers, since that would be a guess; they get the warning too, and William fixes them in the inbox.
- Sample tutors for the test database: `npm run db:sample`. It only runs when `.env` has `ALLOW_SAMPLE_DATA=true`, which only the test database's `.env` should have.

### Waiting on William

Answered (October 2026):
- **Biology:** William hires all tutors. The Biology supervisor schedules the Biology tutors and sends William the schedule, which he enters on the master schedule.
- **Coverage:** 1–2 tutors per hour in MS and LE, 1 in the evening, and at least one Calc and one Stats tutor at all times. See Coverage.
- **Tutors with subjects in more than one building:** usually one place, William's choice. See Coverage.
- **Shift length:** usually 2–4 hours, for example 9–12, 1–4 or 6–8 pm. Only 1 hour when the tutor says that's all they can do between classes. The 1-hour minimum stays.
- **VPA:** 1 tutor.
- **Deadline:** the Spring form link goes out and the schedule is built around December.
- **Building hours:** each building keeps its own hours, and they change every term. See Coverage.
- **Calc and Stats:** Calc is MATH 66, 67, 71, 72, 73, 78 and 79. Stats is only STAT C1000. "Any Math" and the old MATH 63 don't count.
- **Hours:** see the table in Coverage. MS tutor shifts start at 8 am.
- **Evening:** MS needs 1 tutor after 5 pm, and one who covers Calc or Stats is enough.
- **LE must-haves:** none.
- **20-hour limit:** a student tutor must stay under 20 hours, so exactly 20 stays red.
- **Online shifts:** none for now. Everyone works in a building.
- **Biology form:** Biology tutors fill out the form like everyone else, and William forwards their availability to the Biology supervisor.

Still to ask:
- **Odd times (to mention, not blocking):** the form and planner use 15-minute steps (see Layout). Are times like 12:10 and 1:40 common enough for 5-minute steps?
- **Website text:** are these still current? Pay ($18/hour), the hiring list on Become a Tutor (it still lists Math 63), the contact names and emails, and the II-210 Reg IDs on the rules page.

### Next up

Built in October 2026, each with tests first: the course reader accepts `MATH020` and `PHYSIC`; the form uses 15-minute times; dropped shifts start at 3 hours; building hours are stored per term (Terms page editor, form, planner, rules page); MS warns without a Calc or Stats tutor and expects 1 tutor after 5 pm.

The `20261006000000_add_building_hours` migration is on the test database, and the Terms page editor, form and planner were checked in the browser.

William tried the planner on the test database in October 2026 and liked it. His changes, each decided above:
- The form offers 8 am–8 pm every weekday (see Coverage).
- Shifts stretch from the top edge as well as the bottom (see Layout).
- Cards keep their places while William works on a day (see Hours).
- The usual hours become a range (see Hours).
- A Week tab with every tutor's hours (see Hours).
- The course reader closes its gaps (see How it's built).

Two of his other requests are elsewhere: an email to William for each new submission (see feature 2), and the public schedule jumping to the bottom when a subject is picked, a bug on the live site fixed on its own branch off `main`.

Still to do: build the list above, then one pull request, with the migrations applied to the live database before it ships.

---

## 2. Confirmation email

Branch: `feature/confirmation-email`

### Decided

- **When:** sent on every submission. A resubmission says the availability was updated.
- **What it says:**
  - Thanks, and William has their information.
  - The schedule will be created based on the availability they sent (William's wording). William will follow up.
  - A copy of what they sent.
  - How to fix a mistake: open the same link and resubmit with the same student ID, which replaces the old entry. The link is included.
  - William's email for anything else.
- **Never mentions** William's usual hours per tutor.
- **Sender:** a new Gmail account just for the site, sending through Gmail with an app password. Replies go to William's evc.edu address. William approved this and says replies reaching evc.edu are very important. So the Gmail account also forwards everything it receives to his evc.edu address, and a test reply is checked before launch.
- **If sending fails,** the submission is still saved.
- **William gets an email too,** one for each submission or resubmission, sent to his evc.edu address from the same Gmail account. It names the tutor, says whether it is new or updated, and links to the inbox. He doesn't check the dashboard out of habit, so he asked for this after trying the planner (October 2026). It replaces the earlier "no email notifications" decision for the availability form. It never includes his usual hours.
- **Accepted risk:** someone could type another person's email, who would then get a receipt. The 50-per-hour limit per network keeps this small.

### Waiting on William

- Approve the final wording before it goes live. (He approved the Gmail sender and replies going to evc.edu.)

### Setup (Khai)

Done (October 2026): the Gmail account `evc.tutor.schedule@gmail.com` exists, with the name "EVC Tutoring".

Still to do: turn on 2-step verification, create an app password, and add it to the Vercel settings. Set the account to forward all mail to William's evc.edu address. There will be a step-by-step guide when we get there.

### Later

A second email, "your shifts are posted", sent with Publish (feature 4).

---

## 3. Print / Save as PDF

Branch: `feature/print-schedule`

William prints the schedule to put on the wall and sends a PDF to the EVC website team.

### Decided

- The button is admin only, on the dashboard.
- It opens the browser's print dialog, which has "Save as PDF" built in. Nothing extra to install.
- The design copies William's Fall 2026 document (Khai has the Word file and the PDF; they have tutor names, so they stay out of this public repo):
  - Title: "<Term> Math and Science (STEM) Faculty/Staff/Tutor Tutoring Schedule".
  - Listed by subject, not as a grid: Astronomy, Biology, Chemistry, Computer Science, Engineering, Math, Physics. Each heading names the room, for example "Chemistry (Math and Science Resource Center-MSRC, MS-112 of MS3)".
  - In each subject: professors first ("Professor Lee (Chemistry) – Tuesdays 1:00-3:00pm"), then staff with their role, then student tutors.
  - A student tutor is their name and courses, then one bullet per time ("Mon/Wed 12:00-6:00pm (in MS-112)"). Days with the same times are joined. A tutor with several subjects appears under each one.
  - Ends with the MSRC coordinator's contact line.
- William picks the buildings to print with checkboxes. MS and SQ are ticked when the page opens, which matches his document, but any mix works (LE only, VPA only, SQ only, all four). With nothing ticked, the Print button is disabled. The page remembers his last choice on his computer.
- The layout is the same for every building. The title follows the selection:

  | Ticked | Title |
  | --- | --- |
  | MS + SQ | "<Term> Math and Science (STEM) Faculty/Staff/Tutor Tutoring Schedule" |
  | SQ only | "<Term> Biology Tutoring Schedule" |
  | LE only | "<Term> Campus Tutoring Center Schedule" |
  | VPA only | "<Term> Music Tutoring Schedule" |
  | Any other mix | "<Term> Tutoring Schedule" |

- A tutor in two buildings shows only their shifts in the ticked buildings.
- Professors and staff come from Manage Staff, so the print reads the public schedule, not the planner. That means it works today, before the planner or Publish.

### Waiting on William

- Do LE and VPA tutors go on a separate schedule for the website team, and does William make it? (Not blocking: the building checkboxes cover either answer.)
- Are the titles above right?

---

## 4. Publish to the public schedule

Later, after the planner.

Copies William's planned shifts onto the public schedule.

### Open questions

- **Matching:** each submission has to be linked to the right tutor on the public site. Public tutor records have no student ID or email, so this needs a way to link them.
- Publishing a new term's schedule removes all of last term's student tutors at once (William confirmed). It leaves staff and professor hours alone. Those don't come from the form, and William keeps entering them on Manage Staff.
- Send the "your shifts are posted" email (see feature 2).
