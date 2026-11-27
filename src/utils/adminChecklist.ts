/**
 * The admin Dashboard's checklist: William's work for one term, in the order
 * he does it, with each step worked out from real numbers. Kept pure (no
 * database, no React) so every state can be tested.
 *
 * The four steps match the four numbered pages in the sidebar's "Each term"
 * group, so "step 3" means the same page in both places.
 */
import { BUILDINGS, type BuildingHours } from "./centerHours";

/** The fields the checklist needs from a term. */
export interface ChecklistTerm {
  id: number;
  name: string;
  startDate: string; // "YYYY-MM-DD"
  endDate: string;
  isActive: boolean;
  availabilityCode: string | null;
}

/**
 * The term the checklist opens on when William hasn't picked one: the one
 * whose form is open (he is collecting replies for it), else the newest term
 * that hasn't ended (the one being prepared or running), else the active one,
 * else the newest. A picked term wins if it still exists.
 */
export function pickChecklistTerm<T extends ChecklistTerm>(
  terms: T[],
  todayIso: string,
  pickedId?: number | null,
): T | undefined {
  const newestFirst = [...terms].sort((a, b) =>
    a.startDate === b.startDate ? b.id - a.id : a.startDate < b.startDate ? 1 : -1,
  );
  return (
    newestFirst.find((t) => t.id === pickedId) ??
    newestFirst.find((t) => t.availabilityCode) ??
    newestFirst.find((t) => t.endDate >= todayIso) ??
    newestFirst.find((t) => t.isActive) ??
    newestFirst[0]
  );
}

/**
 * Whether to nudge William to add the next term: the shown term has already
 * started and no term starts after it, so the next round of work has nowhere
 * to begin.
 */
export function needsNextTerm(
  shown: ChecklistTerm,
  terms: ChecklistTerm[],
  todayIso: string,
): boolean {
  return shown.startDate <= todayIso && !terms.some((t) => t.startDate > shown.startDate);
}

/**
 * The term still running on the public site that the shown term must wait
 * for: William publishes a new term over the break, so the old schedule
 * stays up through finals (Publish replaces it and makes the new term
 * active). Null once the shown term has started or nothing else is running.
 */
export function termToWaitFor<T extends ChecklistTerm>(
  shown: ChecklistTerm,
  terms: T[],
  todayIso: string,
): T | null {
  if (shown.startDate <= todayIso) return null;
  return (
    terms.find((t) => t.isActive && t.id !== shown.id && t.endDate >= todayIso && t.startDate <= todayIso) ??
    null
  );
}

/** How many of the buildings have hours on at least one weekday. */
export function buildingsWithHours(hours: BuildingHours): number {
  return BUILDINGS.filter((b) => Object.keys(hours[b] ?? {}).length > 0).length;
}

export type StepState = "done" | "todo" | "waiting";

export interface ChecklistStep {
  number: 1 | 2 | 3 | 4;
  title: string;
  href: string;
  linkLabel: string;
  state: StepState;
  /** One short sentence: where things stand. */
  summary: string;
  /** Smaller extra facts, each one line. */
  details: string[];
}

export interface ChecklistInput {
  term: ChecklistTerm & { holidayCount: number; buildingsWithHours: number };
  replies: { pending: number; approved: number; declined: number };
  plan: {
    /** Tutors Publish would put on the website now. */
    withShifts: number;
    /** Approved tutors with no shift yet. */
    approvedNoShifts: number;
    /** Tutors with shifts whose subjects can't be read, so Publish skips them. */
    needsReview: number;
  };
  publish: {
    /** ISO time of this term's last publish, or null. */
    lastPublishedAt: string | null;
    /** The planner differs from what was last published. */
    changedSince: boolean;
    /** This term's tutors are the ones on the public schedule now. */
    onPublicSite: boolean;
    /** Another term still running that this one publishes after (termToWaitFor). */
    waitFor: { name: string; endDate: string } | null;
  };
}

const TOTAL_BUILDINGS = BUILDINGS.length;

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2027-01-26" → "Jan 26, 2027", built from the parts so no timezone shifts it. */
export function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const monthName = new Date(year, month - 1, day, 12).toLocaleDateString("en-US", {
    month: "short",
  });
  return `${monthName} ${day}, ${year}`;
}

/** A publish time in campus time, e.g. "Dec 18 at 3:05 PM". */
export function publishedWhen(iso: string): string {
  const at = new Date(iso);
  const date = at.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  const time = at.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
  return `${date} at ${time}`;
}

function setupStep({ term, replies }: ChecklistInput): ChecklistStep {
  const total = replies.pending + replies.approved + replies.declined;
  const details = [
    `${shortDate(term.startDate)} to ${shortDate(term.endDate)}`,
    term.holidayCount === 0
      ? "No closed days added yet"
      : `${plural(term.holidayCount, "closed day")} added`,
    term.buildingsWithHours === 0
      ? "No building hours yet"
      : term.buildingsWithHours === TOTAL_BUILDINGS
        ? "Building hours set for every room"
        : `Building hours set for ${term.buildingsWithHours} of ${TOTAL_BUILDINGS} rooms`,
  ];
  const base = {
    number: 1 as const,
    title: "Set up the term and send the form",
    href: "/admin/terms",
    linkLabel: "Open Terms & Holidays",
    details,
  };

  if (term.buildingsWithHours === 0) {
    return {
      ...base,
      state: "todo",
      summary: "Add this term's building hours. Tutors can only pick times when a room is open.",
    };
  }
  if (term.availabilityCode) {
    return {
      ...base,
      state: "done",
      summary: "The form is open. Copy the link below and email it to your tutors.",
    };
  }
  if (total > 0) {
    return {
      ...base,
      state: "done",
      summary: `The form is closed. ${plural(total, "tutor")} sent it in.`,
    };
  }
  return {
    ...base,
    state: "todo",
    summary:
      "Check the dates and building hours, then click Open Form to get the link for your tutors.",
  };
}

function repliesStep({ term, replies }: ChecklistInput): ChecklistStep {
  const total = replies.pending + replies.approved + replies.declined;
  const base = {
    number: 2 as const,
    title: "Approve tutors' replies",
    href: "/admin/availability",
    linkLabel: "Open Tutor Availability",
  };
  if (total === 0) {
    return {
      ...base,
      state: "waiting",
      summary: term.availabilityCode
        ? "No replies yet. They show up here as tutors send the form."
        : "No replies yet. Open the form in step 1 first.",
      details: [],
    };
  }
  const details = [
    `${replies.approved} approved, ${replies.declined} declined, ${replies.pending} waiting`,
  ];
  if (replies.pending > 0) {
    return {
      ...base,
      state: "todo",
      summary: `${plural(replies.pending, "reply is", "replies are")} waiting for you to approve or decline.`,
      details,
    };
  }
  return {
    ...base,
    state: "done",
    summary: `All ${plural(total, "reply", "replies")} checked.`,
    details,
  };
}

function plannerStep({ replies, plan, publish }: ChecklistInput): ChecklistStep {
  const base = {
    number: 3 as const,
    title: "Plan shifts and publish",
    href: "/admin/planner",
    linkLabel: "Open Shift Planner",
  };
  const details: string[] = [];
  if (plan.withShifts > 0) details.push(`${plural(plan.withShifts, "tutor")} with shifts`);
  if (plan.approvedNoShifts > 0) {
    details.push(`${plural(plan.approvedNoShifts, "approved tutor")} with no shifts yet`);
  }
  if (plan.needsReview > 0) {
    details.push(
      `${plural(plan.needsReview, "tutor")} with subjects to fix first, so they won't be published`,
    );
  }

  if (plan.withShifts === 0) {
    return replies.approved === 0
      ? {
          ...base,
          state: "waiting",
          summary: "Approve tutors in step 2 first. Then they show up in the planner.",
          details,
        }
      : {
          ...base,
          state: "todo",
          summary: "Drag tutors onto the days and rooms they'll work.",
          details,
        };
  }
  const showing = publish.onPublicSite && publish.lastPublishedAt !== null;
  if (publish.waitFor && !showing) {
    return {
      ...base,
      state: "waiting",
      summary: `Publish after ${publish.waitFor.name} ends on ${shortDate(publish.waitFor.endDate)}, so its schedule stays up through finals. Until then you can keep planning.`,
      details,
    };
  }
  if (publish.lastPublishedAt === null) {
    return {
      ...base,
      state: "todo",
      summary: "Not published yet. Students can't see these shifts until you click Publish.",
      details,
    };
  }
  const when = publishedWhen(publish.lastPublishedAt);
  if (!publish.onPublicSite) {
    return {
      ...base,
      state: "todo",
      summary: `Published ${when}, but another term is on the public schedule now. Publish again to put this term back.`,
      details,
    };
  }
  if (publish.changedSince) {
    return {
      ...base,
      state: "todo",
      summary: `You changed shifts since you published on ${when}. Publish again so students see them.`,
      details,
    };
  }
  return {
    ...base,
    state: "done",
    summary: `Published ${when}. Students see these shifts.`,
    details,
  };
}

function printStep({ publish }: ChecklistInput): ChecklistStep {
  const base = {
    number: 4 as const,
    title: "Print or save the PDF",
    href: "/admin/print",
    linkLabel: "Open Print Schedule",
    details: [],
  };
  // Print reads the public schedule, so it only shows this term once this
  // term is the one published there. Whether he has printed can't be known.
  return publish.onPublicSite && publish.lastPublishedAt !== null
    ? {
        ...base,
        state: "todo",
        summary:
          "Print a copy for the wall, or save a PDF for the EVC website team. Do it again after any change.",
      }
    : {
        ...base,
        state: "waiting",
        summary: "Publish in step 3 first. The printout shows what's on the public schedule.",
      };
}

export function buildChecklist(input: ChecklistInput): ChecklistStep[] {
  return [setupStep(input), repliesStep(input), plannerStep(input), printStep(input)];
}

/**
 * The terms the Dashboard's "Your terms" list shows, oldest first: every term
 * that hasn't ended, the one on the public schedule now, and the one being
 * looked at. Old terms that ended and are off the site stay out, so the list
 * is usually two or three rows; the term picker still reaches them.
 */
export function termsForOverview<T extends ChecklistTerm>(
  terms: T[],
  todayIso: string,
  publicTermId: number | null,
  shownId: number | null,
): T[] {
  return terms
    .filter((t) => t.endDate >= todayIso || t.id === publicTermId || t.id === shownId)
    .sort((a, b) => (a.startDate === b.startDate ? a.id - b.id : a.startDate < b.startDate ? -1 : 1));
}

export type TermStatusKind = "done" | "attention" | "progress" | "waiting" | "notStarted";

export interface TermStatus {
  kind: TermStatusKind;
  /** A few words, e.g. "Step 2: 5 replies to approve". */
  label: string;
}

/**
 * One line for a term in "Your terms". Only steps 1 to 3 count: whether he
 * printed (step 4) can't be known, so a term is done once its shifts are on
 * the public schedule and match the planner.
 */
export function termStatus(input: ChecklistInput): TermStatus {
  const { replies, plan, publish } = input;
  const steps = buildChecklist(input);
  const next = steps.slice(0, 3).find((s) => s.state !== "done");
  if (!next) return { kind: "done", label: "Done. On the website now" };

  const total = replies.pending + replies.approved + replies.declined;
  if (next.number === 3 && publish.lastPublishedAt !== null) {
    if (publish.onPublicSite && publish.changedSince) {
      return { kind: "attention", label: "Changes not published yet" };
    }
    if (!publish.onPublicSite && !publish.waitFor) {
      return { kind: "attention", label: "Published, but another term is on the website" };
    }
  }
  if (next.number === 3 && next.state === "waiting" && publish.waitFor && plan.withShifts > 0) {
    return {
      kind: "waiting",
      label: `Ready. Publish after ${publish.waitFor.name} ends on ${shortDate(publish.waitFor.endDate)}`,
    };
  }
  if (
    next.number === 1 &&
    total === 0 &&
    plan.withShifts === 0 &&
    publish.lastPublishedAt === null &&
    !input.term.availabilityCode
  ) {
    return { kind: "notStarted", label: "Not started" };
  }
  if (next.number === 2 && next.state === "todo") {
    return {
      kind: "progress",
      label: `Step 2: ${plural(replies.pending, "reply", "replies")} to approve`,
    };
  }
  if (next.number === 2) return { kind: "waiting", label: "Step 2: Waiting for tutors' replies" };
  return { kind: "progress", label: `Step ${next.number}: ${next.title}` };
}
