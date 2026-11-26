import { describe, expect, it } from "vitest";
import { fetchTutors } from "./fetchTutors";

const tutor = {
  id: 1,
  name: "Sam Tutor",
  type: "tutor",
  subjects: [{ name: "MATH 71", field: "Mathematics" }],
  fields: ["Mathematics"],
  schedule: [],
};

/** A fetch that answers every request with this status and body. */
const answer =
  (body: string, status = 200, contentType = "application/json") =>
  async () =>
    new Response(body, { status, headers: { "Content-Type": contentType } });

describe("fetchTutors", () => {
  it("returns the tutor list from a good answer", async () => {
    const tutors = await fetchTutors(answer(JSON.stringify({ tutors: [tutor] })));
    expect(tutors).toEqual([tutor]);
  });

  it("returns an empty list when the schedule really has no tutors", async () => {
    await expect(fetchTutors(answer(JSON.stringify({ tutors: [] })))).resolves.toEqual([]);
  });

  it("asks the public tutors route", async () => {
    let asked = "";
    await fetchTutors(async (url) => {
      asked = String(url);
      return new Response(JSON.stringify({ tutors: [] }));
    });
    expect(asked).toBe("/api/tutors");
  });

  it("asks the address it is given (Manage Staff sorts by newest)", async () => {
    let asked = "";
    await fetchTutors(async (url) => {
      asked = String(url);
      return new Response(JSON.stringify({ tutors: [] }));
    }, "/api/tutors?sort=recent");
    expect(asked).toBe("/api/tutors?sort=recent");
  });

  it("names the address it asked when it fails", async () => {
    const fetchImpl = answer(JSON.stringify({ error: "Failed to fetch tutors" }), 500);
    await expect(fetchTutors(fetchImpl, "/api/tutors?sort=recent")).rejects.toThrow(
      "/api/tutors?sort=recent answered 500",
    );
  });

  it("fails the same way for Manage Staff's address", async () => {
    const url = "/api/tutors?sort=recent";
    await expect(fetchTutors(answer("{}", 200), url)).rejects.toThrow("no tutor list");
    await expect(fetchTutors(answer("<html>", 503, "text/html"), url)).rejects.toThrow("503");
    await expect(fetchTutors(answer(JSON.stringify({ tutors: [] }), 500), url)).rejects.toThrow();
  });

  it("fails when the route reports a database error (500 JSON)", async () => {
    const fetchImpl = answer(JSON.stringify({ error: "Failed to fetch tutors" }), 500);
    await expect(fetchTutors(fetchImpl)).rejects.toThrow("500");
  });

  it("fails on a Vercel 503 page that is HTML, not JSON", async () => {
    const fetchImpl = answer("<!doctype html><h1>Service Unavailable</h1>", 503, "text/html");
    await expect(fetchTutors(fetchImpl)).rejects.toThrow("503");
  });

  it("fails on 502 and 504 too", async () => {
    await expect(fetchTutors(answer("Bad Gateway", 502, "text/plain"))).rejects.toThrow();
    await expect(fetchTutors(answer("{}", 504))).rejects.toThrow();
  });

  it("fails on a 500 that still sends an empty tutors list", async () => {
    await expect(fetchTutors(answer(JSON.stringify({ tutors: [] }), 500))).rejects.toThrow();
  });

  it("fails when a 200 body is not JSON", async () => {
    await expect(fetchTutors(answer("<html>oops</html>", 200, "text/html"))).rejects.toThrow();
  });

  it("fails when a 200 body is empty", async () => {
    await expect(fetchTutors(answer(""))).rejects.toThrow();
  });

  it("fails when a 200 body has no tutors key", async () => {
    await expect(fetchTutors(answer(JSON.stringify({ error: "x" })))).rejects.toThrow();
    await expect(fetchTutors(answer("{}"))).rejects.toThrow();
  });

  it("fails when tutors is not an array", async () => {
    for (const bad of [null, "[]", 0, {}, { length: 0 }, true]) {
      await expect(fetchTutors(answer(JSON.stringify({ tutors: bad })))).rejects.toThrow();
    }
  });

  it("fails when the body is JSON but not an object", async () => {
    for (const body of ["null", "[]", "42", '"tutors"', "true"]) {
      await expect(fetchTutors(answer(body))).rejects.toThrow();
    }
  });

  it("fails when the network itself fails", async () => {
    const offline = async () => {
      throw new TypeError("Failed to fetch");
    };
    await expect(fetchTutors(offline)).rejects.toThrow("Failed to fetch");
  });
});

describe("fetchTutors fuzz", () => {
  // Small seeded generator so a failure can be replayed.
  const random = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };

  const bodies: string[] = [
    "",
    "null",
    "[]",
    "{}",
    "<!doctype html><title>Error</title>",
    "Internal Server Error",
    "{not json",
    JSON.stringify({ error: "Failed to fetch tutors" }),
    JSON.stringify({ tutors: [] }),
    JSON.stringify({ tutors: [tutor] }),
    JSON.stringify({ tutors: null }),
    JSON.stringify({ tutors: {} }),
    JSON.stringify({ tutors: "[]" }),
    JSON.stringify({ tutors: [], error: "partial" }),
    JSON.stringify([{ tutors: [] }]),
  ];
  // Response only allows 200–599; 204/205/304 cannot carry a body.
  const statuses = [200, 201, 202, 203, 206, 299, 300, 301, 400, 401, 403, 404, 429, 500, 502, 503, 504, 599];

  it("only ever returns a list for a 2xx answer whose tutors is an array", async () => {
    const next = random(20261126);
    for (let i = 0; i < 2000; i++) {
      const status = statuses[Math.floor(next() * statuses.length)];
      const body = bodies[Math.floor(next() * bodies.length)];

      let expected: unknown[] | null = null;
      if (status >= 200 && status < 300) {
        try {
          const parsed = JSON.parse(body);
          if (parsed && Array.isArray(parsed.tutors)) expected = parsed.tutors;
        } catch {
          // Not JSON, so it must fail.
        }
      }

      const result = await fetchTutors(answer(body, status)).then(
        (tutors) => ({ tutors }),
        () => null,
      );

      if (expected === null) {
        expect(result, `status ${status}, body ${body}`).toBeNull();
      } else {
        expect(result?.tutors, `status ${status}, body ${body}`).toEqual(expected);
      }
    }
  });

  it("never returns for random junk bytes", async () => {
    const next = random(42);
    for (let i = 0; i < 500; i++) {
      const length = Math.floor(next() * 40);
      const junk = Array.from({ length }, () =>
        String.fromCharCode(32 + Math.floor(next() * 95)),
      ).join("");
      const status = statuses[Math.floor(next() * statuses.length)];
      let isList = false;
      try {
        const parsed = JSON.parse(junk);
        isList = status < 300 && Array.isArray(parsed?.tutors);
      } catch {
        // Junk is almost never JSON.
      }
      const ok = await fetchTutors(answer(junk, status)).then(
        () => true,
        () => false,
      );
      expect(ok, `status ${status}, body ${junk}`).toBe(isList);
    }
  });
});
