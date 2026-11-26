/**
 * The NetTutor steps, shared by the public schedule's online tutoring box and
 * the printed schedule, so the two always say the same thing.
 */

export const NETTUTOR_VIDEO_URL = "https://youtu.be/VlrPU34FzuY";

/** The six steps as list items; each caller supplies its own <ol>. */
export const NetTutorStepItems = () => (
  <>
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
      During drop-in hours: meet with a tutor live, schedule an appointment, OR
      drop off a question for feedback
    </li>
    <li>
      When meeting with a live tutor, follow their instructions to receive
      tutoring through the Drawing Canvas and/or video chat
    </li>
    <li>
      For writing help, use the <strong>Writing and Paper Center</strong>{" "}
      option at the bottom of the Subjects page to drop off papers for feedback
    </li>
  </>
);
