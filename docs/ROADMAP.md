# Roadmap

What comes after the tutor availability form ([PR #2](https://github.com/khainguyen21/EVC_Project/pull/2)).

There are four features. Each one gets its own branch and pull request, built in this order:

1. [Shift planner](#1-shift-planner)
2. [Confirmation email](#2-confirmation-email)
3. [Print / Save as PDF](#3-print--save-as-pdf)
4. [Publish to the public schedule](#4-publish-to-the-public-schedule)

The planner comes first because the Spring form link is not going out soon. The email has to be live before that link goes out. Print can move up if the EVC website team needs a PDF sooner.

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
- A dropped shift is 2 hours by default. Drag its bottom edge to change the length, in half-hour steps, with a 1-hour minimum.
- A tutor can have more than one shift in a day (split shifts), but can't be in two places at the same time.
- Each card shows the tutor's notes from the form.
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

- While William drags a tutor, the buildings that match their subjects light up.
- Dropping a tutor into another building is allowed, with a warning. William has the final say.

**Coverage, per building, every half hour**
- MS and LE: the goal is 2 tutors; 1 is acceptable.
- SQ: the goal is 1 tutor.
- VPA: 1 tutor for now, until William says otherwise.
- A tutor adds coverage only if they cover at least one course the others there at that time don't. Two tutors who both only do MATH-071 show a "same subjects" warning. Calc with Stat counts as 2.
- A tutor counts only for their courses that belong to that building. A Chemistry and English tutor placed in MS counts for Chemistry only. A tutor with no courses for that building gets the warning and doesn't count toward it.
- Every building uses the center hours (Monday 9 am–6 pm, Tuesday to Thursday 9 am–8 pm, Friday 9 am–5 pm) until William says otherwise.
- Hovering the coverage strip lists the courses covered at that time.
- Only the student tutors William places count. Staff and professor hours from the public schedule are not shown in the first version.
- These are warnings. The planner never blocks William.

**Hours**
- Each card shows the tutor's total hours this week, across all days.
- William aims to give each tutor about the same weekly hours, his "usual hours". It is a planner setting, stored in the database rather than the code.
- The usual hours have no starting value in the code. William types his number once on the planner page.
- Cards show progress toward the usual hours: gray below it, green at it, amber above it. Until William sets the number, cards only change color at 20 hours.
- Only student tutors fill out the availability form, so everyone in the planner is a student tutor. They turn red at 20 hours a week.
- The tutor list sorts the fewest hours to the top, so nobody gets forgotten.
- The top of each building's column shows its total planned hours for the week. This is for now and may change once we know about the budget.

**Outside availability**
- William can place a shift outside the hours a tutor sent. It gets a clear "outside their availability" warning.

**Saving**
- Every change saves as William goes, in its own table, separate from the public schedule.
- Undo (button, or Ctrl+Z / Cmd+Z) for the last 20 changes while the page is open.
- Nothing on the public site changes until Publish (feature 4).

**Not in the first version**
- Copying one day to another ("Wednesday same as Monday"). This is the first thing to add afterward.
- A whole-week overview screen. The print view (feature 3) covers this.
- Approving tutors from inside the planner. William keeps using the inbox.
- A separate login for the SQ coordinator (waiting on William).
- Showing staff and professor hours.

**How it's built**
- One branch with small commits, and one pull request after William has tried it.
- Tests for the rules (coverage, "adds a new course", hour totals, fitting a shift into free time) are written before the code. Dragging is checked in the browser.

### Waiting on William

Asked, waiting for his reply:
- **SQ:** does the SQ coordinator schedule the Biology tutors and do the final step, or does William recruit Biology tutors too? If the coordinator schedules them, do they need their own login?
- **Coverage:** confirm 2 tutors per hour in MS and LE (1 is okay if the budget is tight) and 1 per hour in SQ, with 2 tutors at the same time covering different classes.
- **Tutors with subjects in more than one building** (for example Biology, Chemistry, and English): can they work in each, or must they pick one? If they pick, should the form ask?
- **Shift length:** confirm 2 hours usual and 1 hour minimum.

Still to ask:
- **VPA (Music):** who is in charge, and how many tutors per hour?
- **Professors and staff:** do their hours in a building count toward the 2 tutors per hour? Until then, a building a professor covers can still show a gap.
- **Building hours:** are all four buildings open the center hours, or are some open less?
- **Budget:** is there a weekly hours budget per building or for the whole center, and roughly how much?
- **Deadline:** when does William usually build the Spring schedule?

### Prototype

`/admin/planner-prototype` is a throwaway prototype with three layouts and sample tutors. It lives on its own branch, `prototype/shift-planner`, and is never merged.

---

## 2. Confirmation email

Branch: `feature/confirmation-email`

### Decided

- **When:** sent on every submission. A resubmission says the availability was updated.
- **What it says:**
  - Thanks, and William has their information.
  - Sending availability does not guarantee those hours. William is working on the schedule and will follow up.
  - A copy of what they sent.
  - How to fix a mistake: open the same link and resubmit with the same student ID, which replaces the old entry. The link is included.
  - William's email for anything else.
- **Never mentions** William's usual hours per tutor.
- **Sender:** a new Gmail account just for the site, sending through Gmail with an app password. Replies go to William's evc.edu address.
- **If sending fails,** the submission is still saved.
- **Accepted risk:** someone could type another person's email, who would then get a receipt. The 50-per-hour limit per network keeps this small.

### Waiting on William

- Asked: is he okay with the email coming from a new Gmail account (for example evc.tutor.schedule@gmail.com) and replies going to his evc.edu inbox? Anything he wants it to say?
- Approve the final wording before it goes live.

### Setup (Khai)

Create the Gmail account, turn on 2-step verification, create an app password, and add it to the Vercel settings. There will be a step-by-step guide when we get there.

### Later

A second email, "your shifts are posted", sent with Publish (feature 4).

---

## 3. Print / Save as PDF

Branch: `feature/print-schedule`

William prints the schedule to put on the wall and sends a PDF to the EVC website team.

### Decided

- The button is admin only, on the dashboard.
- It opens the browser's print dialog, which has "Save as PDF" built in. Nothing extra to install.
- The default design, unless William's sample says otherwise: one weekly grid per building, days across and times down, each shift showing the tutor's name and subjects, one building per landscape letter page.

### Waiting on William

Not asked yet:
- A copy of the last PDF he sent the website team.
- Does the website team want the schedule listed by subject, or as a weekly grid by building?

---

## 4. Publish to the public schedule

Later, after the planner.

Copies William's planned shifts onto the public schedule.

### Open questions

- **Matching:** each submission has to be linked to the right tutor on the public site. Public tutor records have no student ID or email, so this needs a way to link them.
- Does publishing replace the whole week, or only the tutors who changed? Either way, it must leave staff and professor hours alone. Those don't come from the form, and William keeps entering them on Manage Staff.
- Send the "your shifts are posted" email (see feature 2).
