"use client";

import { useState } from "react";
import { ChevronDown, Laptop, PlayCircle } from "lucide-react";
import styles from "@/components/SchedulePage.module.css";

/**
 * Online tutoring, right under the sign so students who can't come to campus
 * see it first (William asked for it near the top, 2026-11-25). The six steps
 * start folded so the search box still fits on the first screen.
 */
const NetTutorBox = () => {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.nettutor} aria-labelledby="nettutor-title">
      <div className={styles.nettutorHead}>
        <Laptop className={styles.nettutorIcon} size={22} aria-hidden="true" />
        <div>
          <h2 id="nettutor-title" className={styles.nettutorTitle}>
            Online tutoring with NetTutor
          </h2>
          <p className={styles.nettutorLede}>
            EVC students can access <strong>NetTutor</strong> for all subjects
            by logging into their Canvas course.
          </p>
        </div>
      </div>

      <div className={styles.nettutorActions}>
        <button
          type="button"
          className={styles.nettutorToggle}
          aria-expanded={open}
          aria-controls="nettutor-steps"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide the steps" : "Show the 6 steps"}
          <ChevronDown
            className={open ? styles.chevronOpen : undefined}
            size={16}
            aria-hidden="true"
          />
        </button>
        <a
          href="https://youtu.be/VlrPU34FzuY"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.videoLink}
        >
          <PlayCircle size={16} aria-hidden="true" />
          Watch the tutorial (YouTube)
        </a>
      </div>

      <ol id="nettutor-steps" className={styles.steps} hidden={!open}>
        <li>Log into the Canvas course you need tutoring for</li>
        <li>
          Open <strong>Pisces/NetTutor Online Tutoring</strong> on the Canvas
          left-hand navigation
        </li>
        <li>
          Open NetTutor to see all subjects tutored, then click on your subject
          (e.g., Math Statistics) to see the drop-in schedule in the upper
          right-hand corner
        </li>
        <li>
          During drop-in hours: meet with a tutor live, schedule an appointment,
          OR drop off a question for feedback
        </li>
        <li>
          When meeting with a live tutor, follow their instructions to receive
          tutoring through the Drawing Canvas and/or video chat
        </li>
        <li>
          For writing help, use the <strong>Writing and Paper Center</strong>{" "}
          option at the bottom of the Subjects page to drop off papers for
          feedback
        </li>
      </ol>
    </section>
  );
};

export default NetTutorBox;
