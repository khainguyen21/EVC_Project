import { describe, expect, it } from "vitest";
import { FALL_2026_HOURS } from "./testFixtures";
import {
  buildChecklist,
  buildingsWithHours,
  needsNextTerm,
  pickChecklistTerm,
  shortDate,
  termStatus,
  termToWaitFor,
  termsForOverview,
  type ChecklistInput,
  type ChecklistTerm,
} from "./adminChecklist";
import type { BuildingHours } from "./centerHours";

function term(id: number, startDate: string, endDate: string, extra: Partial<ChecklistTerm> = {}) {
  return {
    id,
    name: `Term ${id}`,
    startDate,
    endDate,
    isActive: false,
    availabilityCode: null,
    ...extra,
  };
}

const fall = term(1, "2026-08-31", "2026-12-18", { isActive: true });
const spring = term(2, "2027-01-26", "2027-05-22");
const oldSpring = term(3, "2026-01-26", "2026-05-22");

describe("pickChecklistTerm", () => {
  const today = "2026-11-26";

  it("opens the term whose form is open", () => {
    const open = { ...fall, availabilityCode: "abc" };
    expect(pickChecklistTerm([spring, open, oldSpring], today)?.id).toBe(1);
  });

  it("else the newest term that hasn't ended, so a new Spring wins over a running Fall", () => {
    expect(pickChecklistTerm([fall, spring, oldSpring], today)?.id).toBe(2);
    expect(pickChecklistTerm([oldSpring, fall], today)?.id).toBe(1);
  });

  it("doesn't depend on the order the terms come in", () => {
    expect(pickChecklistTerm([oldSpring, spring, fall], today)?.id).toBe(2);
    expect(pickChecklistTerm([spring, fall, oldSpring], today)?.id).toBe(2);
  });

  it("else the active term, else the newest, once every term has ended", () => {
    const later = "2028-01-01";
    expect(pickChecklistTerm([spring, fall, oldSpring], later)?.id).toBe(1);
    const activeOld = { ...oldSpring, isActive: true };
    expect(pickChecklistTerm([spring, { ...fall, isActive: false }, activeOld], later)?.id).toBe(3);
    expect(pickChecklistTerm([oldSpring, spring], later)?.id).toBe(2);
    expect(pickChecklistTerm([], today)).toBeUndefined();
  });

  it("counts the last day of a term as not ended", () => {
    expect(pickChecklistTerm([oldSpring, fall], "2026-12-18")?.id).toBe(1);
  });

  it("opens a picked term ahead of the rest, and ignores one that no longer exists", () => {
    expect(pickChecklistTerm([fall, spring], today, 1)?.id).toBe(1);
    expect(pickChecklistTerm([fall, spring], today, 99)?.id).toBe(2);
    expect(pickChecklistTerm([fall, spring], today, null)?.id).toBe(2);
  });
});

describe("needsNextTerm", () => {
  it("nudges when the shown term has started and nothing comes after it", () => {
    expect(needsNextTerm(fall, [fall, oldSpring], "2026-11-26")).toBe(true);
    expect(needsNextTerm(fall, [fall, oldSpring], "2026-12-30")).toBe(true);
  });

  it("stays quiet when a later term exists or the shown term hasn't started", () => {
    expect(needsNextTerm(fall, [fall, spring], "2026-11-26")).toBe(false);
    expect(needsNextTerm(spring, [fall, spring], "2026-11-26")).toBe(false);
  });
});

describe("termToWaitFor", () => {
  it("is the running active term while the shown term hasn't started", () => {
    expect(termToWaitFor(spring, [fall, spring], "2026-11-26")?.id).toBe(1);
    expect(termToWaitFor(spring, [fall, spring], "2026-12-18")?.id).toBe(1);
  });

  it("is nothing once the running term ends or the shown term starts", () => {
    expect(termToWaitFor(spring, [fall, spring], "2026-12-19")).toBeNull();
    expect(termToWaitFor(spring, [fall, spring], "2027-01-26")).toBeNull();
  });

  it("is nothing when the shown term is the active one, or no other term is active", () => {
    const activeSpring = { ...spring, isActive: true };
    expect(termToWaitFor(activeSpring, [{ ...fall, isActive: false }, activeSpring], "2026-11-26")).toBeNull();
    expect(termToWaitFor(spring, [{ ...fall, isActive: false }, spring], "2026-11-26")).toBeNull();
  });

  it("ignores an active term that hasn't started either", () => {
    const summer = term(4, "2027-06-01", "2027-07-31");
    expect(termToWaitFor(summer, [summer, { ...spring, isActive: true }], "2026-11-26")).toBeNull();
  });
});

describe("buildingsWithHours", () => {
  it("counts rooms with at least one open weekday", () => {
    expect(buildingsWithHours(FALL_2026_HOURS)).toBe(4);
    const some: BuildingHours = {
      ...FALL_2026_HOURS,
      "SQ-231": {},
      "VPA-109/111": {},
    };
    expect(buildingsWithHours(some)).toBe(2);
    const none = { "MS-112": {}, "LE-237": {}, "SQ-231": {}, "VPA-109/111": {} } as BuildingHours;
    expect(buildingsWithHours(none)).toBe(0);
  });
});

describe("shortDate", () => {
  it("formats without a timezone shift", () => {
    expect(shortDate("2027-01-26")).toBe("Jan 26, 2027");
    expect(shortDate("2026-12-01")).toBe("Dec 1, 2026");
  });
});

// A finished, published term: every step done except printing.
function input(patch: {
  term?: Partial<ChecklistInput["term"]>;
  replies?: Partial<ChecklistInput["replies"]>;
  plan?: Partial<ChecklistInput["plan"]>;
  publish?: Partial<ChecklistInput["publish"]>;
} = {}): ChecklistInput {
  return {
    term: { ...spring, holidayCount: 3, buildingsWithHours: 4, ...patch.term },
    replies: { pending: 0, approved: 10, declined: 1, ...patch.replies },
    plan: { withShifts: 10, approvedNoShifts: 0, needsReview: 0, ...patch.plan },
    publish: {
      lastPublishedAt: "2027-01-10T23:05:00.000Z",
      changedSince: false,
      onPublicSite: true,
      waitFor: null,
      ...patch.publish,
    },
  };
}

const states = (i: ChecklistInput) => buildChecklist(i).map((s) => s.state);

describe("buildChecklist", () => {
  it("has four steps that match the sidebar's numbered pages", () => {
    const steps = buildChecklist(input());
    expect(steps.map((s) => [s.number, s.href])).toEqual([
      [1, "/admin/terms"],
      [2, "/admin/availability"],
      [3, "/admin/planner"],
      [4, "/admin/print"],
    ]);
  });

  it("a brand-new term with no hours: add hours, everything else waits", () => {
    const fresh = input({
      term: { buildingsWithHours: 0, holidayCount: 0 },
      replies: { approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(states(fresh)).toEqual(["todo", "waiting", "waiting", "waiting"]);
    const [setup, replies] = buildChecklist(fresh);
    expect(setup.summary).toMatch(/building hours/);
    expect(setup.details).toContain("No building hours yet");
    expect(setup.details).toContain("No closed days added yet");
    expect(replies.summary).toMatch(/Open the form in step 1/);
  });

  it("hours set, form not opened: tells him to click Open Form", () => {
    const ready = input({
      replies: { approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    const [setup] = buildChecklist(ready);
    expect(setup.state).toBe("todo");
    expect(setup.summary).toMatch(/Open Form/);
    expect(setup.details[0]).toBe("Jan 26, 2027 to May 22, 2027");
  });

  it("form open with no replies yet: step 1 done, step 2 waiting for tutors", () => {
    const open = input({
      term: { availabilityCode: "abc" },
      replies: { approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(states(open)).toEqual(["done", "waiting", "waiting", "waiting"]);
    expect(buildChecklist(open)[1].summary).toMatch(/as tutors send the form/);
  });

  it("replies waiting: step 2 is to do and says how many", () => {
    const waiting = input({
      term: { availabilityCode: "abc" },
      replies: { pending: 1, approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(states(waiting)).toEqual(["done", "todo", "waiting", "waiting"]);
    expect(buildChecklist(waiting)[1].summary).toBe(
      "1 reply is waiting for you to approve or decline.",
    );
    const many = input({ replies: { pending: 4 } });
    expect(buildChecklist(many)[1].summary).toBe(
      "4 replies are waiting for you to approve or decline.",
    );
  });

  it("approved but nobody placed: step 3 says to drag tutors", () => {
    const placing = input({
      plan: { withShifts: 0, approvedNoShifts: 10 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    const planner = buildChecklist(placing)[2];
    expect(planner.state).toBe("todo");
    expect(planner.summary).toMatch(/Drag tutors/);
    expect(planner.details).toEqual(["10 approved tutors with no shifts yet"]);
  });

  it("shifts placed, not published: step 3 to do, print waits", () => {
    const unpublished = input({
      plan: { approvedNoShifts: 1, needsReview: 1 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(states(unpublished)).toEqual(["done", "done", "todo", "waiting"]);
    const planner = buildChecklist(unpublished)[2];
    expect(planner.summary).toMatch(/Not published yet/);
    expect(planner.details).toEqual([
      "10 tutors with shifts",
      "1 approved tutor with no shifts yet",
      "1 tutor with subjects to fix first, so they won't be published",
    ]);
  });

  it("published and unchanged: step 3 done in campus time, print ready", () => {
    const done = input();
    expect(states(done)).toEqual(["done", "done", "done", "todo"]);
    // 23:05 UTC on Jan 10 is 3:05 pm in San José.
    expect(buildChecklist(done)[2].summary).toBe(
      "Published Jan 10 at 3:05 PM. Students see these shifts.",
    );
  });

  it("changed since publishing: step 3 asks to publish again", () => {
    const changed = input({ publish: { changedSince: true } });
    expect(states(changed)).toEqual(["done", "done", "todo", "todo"]);
    expect(buildChecklist(changed)[2].summary).toMatch(/Publish again/);
  });

  it("another term was published later: step 3 says so, print waits", () => {
    const replaced = input({ publish: { onPublicSite: false } });
    expect(states(replaced)).toEqual(["done", "done", "todo", "waiting"]);
    expect(buildChecklist(replaced)[2].summary).toMatch(/another term is on the public schedule/);
  });

  it("next term planned while this one runs: hold Publish until it ends", () => {
    const early = input({
      publish: { lastPublishedAt: null, onPublicSite: false, waitFor: { name: "Fall 2026", endDate: "2026-12-18" } },
    });
    expect(states(early)).toEqual(["done", "done", "waiting", "waiting"]);
    expect(buildChecklist(early)[2].summary).toBe(
      "Publish after Fall 2026 ends on Dec 18, 2026, so its schedule stays up through finals. Until then you can keep planning.",
    );
    // A test publish that the running term later replaced reads the same.
    const replaced = input({
      publish: { onPublicSite: false, waitFor: { name: "Fall 2026", endDate: "2026-12-18" } },
    });
    expect(buildChecklist(replaced)[2].summary).toMatch(/^Publish after Fall 2026/);
    // Nobody placed yet: planning comes first.
    const unplanned = input({
      plan: { withShifts: 0, approvedNoShifts: 3 },
      publish: { lastPublishedAt: null, onPublicSite: false, waitFor: { name: "Fall 2026", endDate: "2026-12-18" } },
    });
    expect(buildChecklist(unplanned)[2].summary).toMatch(/Drag tutors/);
  });

  it("form closed after replies came in: step 1 done and counts them", () => {
    expect(buildChecklist(input())[0].summary).toBe("The form is closed. 11 tutors sent it in.");
    const one = input({ replies: { approved: 1, declined: 0 }, plan: { withShifts: 1 } });
    expect(buildChecklist(one)[0].summary).toBe("The form is closed. 1 tutor sent it in.");
  });

  it("says rooms honestly when only some have hours", () => {
    const partial = input({ term: { buildingsWithHours: 2 } });
    expect(buildChecklist(partial)[0].details).toContain("Building hours set for 2 of 4 rooms");
    expect(buildChecklist(input())[0].details).toContain("Building hours set for every room");
  });

  it("fuzz: any mix of numbers gives four sensible, well-formed steps", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 3000; i++) {
      const published = rand(2) === 0;
      const sample = input({
        term: {
          availabilityCode: rand(2) ? "code" : null,
          holidayCount: rand(5),
          buildingsWithHours: rand(5),
        },
        replies: { pending: rand(4), approved: rand(4), declined: rand(3) },
        plan: { withShifts: rand(4), approvedNoShifts: rand(3), needsReview: rand(3) },
        publish: {
          lastPublishedAt: published ? new Date(Date.UTC(2027, rand(12), 1 + rand(28), rand(24), rand(60))).toISOString() : null,
          changedSince: rand(2) === 0,
          onPublicSite: published && rand(2) === 0,
          waitFor: rand(3) === 0 ? { name: "Fall 2026", endDate: "2026-12-18" } : null,
        },
      });
      const steps = buildChecklist(sample);
      expect(steps.map((s) => s.number)).toEqual([1, 2, 3, 4]);
      for (const step of steps) {
        expect(["done", "todo", "waiting"]).toContain(step.state);
        const text = [step.summary, ...step.details].join(" | ");
        expect(text).not.toMatch(/undefined|NaN|null|\b1 (tutors|replies|days|rooms)\b|\b([02-9]|\d\d+) (tutor|reply|closed day) /);
        expect(step.summary.endsWith(".")).toBe(true);
      }
      // Nothing can be published or printed before anyone has shifts.
      if (sample.plan.withShifts === 0) expect(steps[2].state).not.toBe("done");
      // Step 3 is only done once what's on the site matches the planner.
      if (steps[2].state === "done") {
        expect(sample.publish.onPublicSite && !sample.publish.changedSince).toBe(true);
      }
      // Never tells him to publish while another term must stay up.
      if (sample.publish.waitFor && !sample.publish.onPublicSite) {
        expect(steps[2].summary).not.toMatch(/Publish again|Not published yet/);
      }
      // Print is only offered when this term is the one students see.
      if (steps[3].state === "todo") expect(sample.publish.onPublicSite).toBe(true);
    }
  });
});

describe("termsForOverview", () => {
  const today = "2026-11-26";
  const ids = (list: { id: number }[]) => list.map((t) => t.id);

  it("shows terms that haven't ended, oldest first, and hides old ones", () => {
    expect(ids(termsForOverview([spring, oldSpring, fall], today, 1, null))).toEqual([1, 2]);
  });

  it("keeps the term on the website even after it ended", () => {
    expect(ids(termsForOverview([spring, fall, oldSpring], "2026-12-30", 1, null))).toEqual([1, 2]);
    expect(ids(termsForOverview([spring, fall, oldSpring], "2026-12-30", null, null))).toEqual([2]);
  });

  it("keeps the term being looked at, even an old one", () => {
    expect(ids(termsForOverview([spring, fall, oldSpring], today, 1, 3))).toEqual([3, 1, 2]);
  });

  it("counts the last day as not ended, and handles no terms", () => {
    expect(ids(termsForOverview([fall], "2026-12-18", null, null))).toEqual([1]);
    expect(termsForOverview([], today, null, null)).toEqual([]);
  });

  it("doesn't change the list it was given", () => {
    const list = [spring, fall];
    termsForOverview(list, today, null, null);
    expect(ids(list)).toEqual([2, 1]);
  });
});

describe("termStatus", () => {
  it("done once the shifts are on the website and match the planner", () => {
    expect(termStatus(input())).toEqual({ kind: "done", label: "Done. On the website now" });
  });

  it("doesn't wait on printing (step 4)", () => {
    const steps = buildChecklist(input());
    expect(steps[3].state).not.toBe("done");
    expect(termStatus(input()).kind).toBe("done");
  });

  it("flags shift changes that aren't published yet", () => {
    expect(termStatus(input({ publish: { changedSince: true } }))).toEqual({
      kind: "attention",
      label: "Changes not published yet",
    });
  });

  it("flags a published term that another term pushed off the website", () => {
    expect(termStatus(input({ publish: { onPublicSite: false } })).label).toBe(
      "Published, but another term is on the website",
    );
  });

  it("a brand-new term is not started", () => {
    const fresh = input({
      term: { buildingsWithHours: 0 },
      replies: { approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(termStatus(fresh)).toEqual({ kind: "notStarted", label: "Not started" });
    // Hours set but form not opened yet: still not started.
    expect(termStatus(input({ ...fresh, term: { buildingsWithHours: 4 } })).kind).toBe("notStarted");
  });

  it("form open, no replies: waiting for tutors", () => {
    const open = input({
      term: { availabilityCode: "abc" },
      replies: { approved: 0, declined: 0 },
      plan: { withShifts: 0 },
      publish: { lastPublishedAt: null, onPublicSite: false },
    });
    expect(termStatus(open)).toEqual({ kind: "waiting", label: "Step 2: Waiting for tutors' replies" });
  });

  it("replies to approve: says how many, with the right plural", () => {
    const pending = (n: number) =>
      termStatus(input({ term: { availabilityCode: "abc" }, replies: { pending: n } })).label;
    expect(pending(5)).toBe("Step 2: 5 replies to approve");
    expect(pending(1)).toBe("Step 2: 1 reply to approve");
  });

  it("all approved, not published: step 3", () => {
    const ready = input({ publish: { lastPublishedAt: null, onPublicSite: false } });
    expect(termStatus(ready)).toEqual({ kind: "progress", label: "Step 3: Plan shifts and publish" });
  });

  it("next term ready while this one still runs: publish after it ends", () => {
    const ready = input({
      publish: {
        lastPublishedAt: null,
        onPublicSite: false,
        waitFor: { name: "Fall 2026", endDate: "2026-12-18" },
      },
    });
    expect(termStatus(ready)).toEqual({
      kind: "waiting",
      label: "Ready. Publish after Fall 2026 ends on Dec 18, 2026",
    });
  });

  it("missing building hours on a term with replies: back to step 1", () => {
    expect(termStatus(input({ term: { buildingsWithHours: 0 } })).label).toBe(
      "Step 1: Set up the term and send the form",
    );
  });

  it("fuzz: always a short clean label that agrees with the checklist", () => {
    let seed = 7;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed % n;
    };
    for (let i = 0; i < 3000; i++) {
      const published = rand(2) === 0;
      const sample = input({
        term: { availabilityCode: rand(2) ? "code" : null, buildingsWithHours: rand(5) },
        replies: { pending: rand(4), approved: rand(4), declined: rand(3) },
        plan: { withShifts: rand(4), approvedNoShifts: rand(3), needsReview: rand(3) },
        publish: {
          lastPublishedAt: published ? "2027-01-10T23:05:00.000Z" : null,
          changedSince: rand(2) === 0,
          onPublicSite: published && rand(2) === 0,
          waitFor: rand(3) === 0 ? { name: "Fall 2026", endDate: "2026-12-18" } : null,
        },
      });
      const status = termStatus(sample);
      const steps = buildChecklist(sample);
      expect(["done", "attention", "progress", "waiting", "notStarted"]).toContain(status.kind);
      expect(status.label).not.toMatch(/undefined|NaN|null|\b1 replies\b|\b([02-9]|\d\d+) reply\b/);
      expect(status.label.length).toBeLessThan(60);
      // Done means steps 1-3 are all done, and only then.
      expect(status.kind === "done").toBe(steps.slice(0, 3).every((s) => s.state === "done"));
      if (status.kind === "done") {
        expect(sample.publish.onPublicSite && !sample.publish.changedSince).toBe(true);
      }
      // Never says "not started" once anything has happened.
      if (status.kind === "notStarted") {
        expect(sample.replies.pending + sample.replies.approved + sample.replies.declined).toBe(0);
        expect(sample.publish.lastPublishedAt).toBeNull();
        expect(sample.term.availabilityCode).toBeNull();
      }
      // A "Step N" label points at the first step that isn't done.
      const match = status.label.match(/^Step (\d)/);
      if (match) {
        const first = steps.slice(0, 3).find((s) => s.state !== "done");
        expect(Number(match[1])).toBe(first?.number);
      }
    }
  });
});
