import { Check } from "lucide-react";
import type { Term } from "@/types";
import { groupedHours } from "@/utils/centerHours";
import sign from "@/components/SchedulePage.module.css";
import styles from "@/components/PublicPage.module.css";

interface Props {
  /** Active term, read on the server; null when none is configured. */
  term: Term | null;
}

const REGISTRATION = [
  <>
    <strong>Courses (Reg ID):</strong> II-210-207 (130387), II-210-208
    (130388), II-210-209 (130389)
  </>,
  <>No fee, no units, no grades.</>,
  <>
    Use your Student ID number to log in/out every time. Unregistered students
    are not allowed.
  </>,
  <>
    Picture ID required to check out materials (calculators, laptops,
    textbooks).
  </>,
];

/** The body of the tutoring rules page; the title and intro sit on its sign. */
const TutoringRules = ({ term }: Props) => {
  // This page is the MSRC's, so it lists MS-112's hours for the term.
  const msrc = term?.buildingHours["MS-112"];
  const hours = msrc && Object.keys(msrc).length > 0 ? groupedHours(msrc) : [];

  return (
    <>
      <div className={styles.columns}>
        <div>
          <section className={styles.section} aria-labelledby="hours-title">
            <div className={sign.subjectHead}>
              <h2 id="hours-title" className={sign.subjectTitle}>
                {term ? `${term.name} hours` : "Current hours"}
              </h2>
            </div>
            <ul className={styles.hours}>
              {hours.map(({ label, hours }) => (
                <li key={label} className={styles.hoursRow}>
                  <span className={styles.hoursDay}>{label}</span>
                  <span className={styles.hoursTime}>{hours}</span>
                </li>
              ))}
              {hours.length === 0 && (
                <li className={styles.hoursRow}>
                  This term&apos;s hours will be posted soon.
                </li>
              )}
              <li className={styles.hoursRow}>
                <span className={styles.hoursDay}>Saturday, Sunday</span>
                <span className={styles.hoursClosed}>Closed</span>
              </li>
            </ul>
          </section>

          <section
            className={styles.section}
            aria-labelledby="registration-title"
          >
            <div className={sign.subjectHead}>
              <h2 id="registration-title" className={sign.subjectTitle}>
                Registration &amp; use
              </h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                All eligible students must register for a noncredit{" "}
                <strong>II-210 Supervised Tutoring</strong> section prior to
                attending.
              </p>
            </div>
            <ul className={styles.checks}>
              {REGISTRATION.map((item, i) => (
                <li key={i} className={styles.check}>
                  <Check
                    className={styles.checkIcon}
                    size={18}
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className={styles.section} aria-labelledby="dos-title">
          <div className={sign.subjectHead}>
            <h2 id="dos-title" className={sign.subjectTitle}>
              Dos and don&apos;ts
            </h2>
          </div>
          <div className={styles.sectionBody}>
            <ol className={styles.numbered}>
              <li>Log-in and log-out every time you use the center.</li>
              <li>No food, drinks, children, or pets allowed.</li>
              <li>Please set cell phones on vibrate and talk outside.</li>
              <li>Do not copy from solution manuals.</li>
              <li>
                Please try the problem first yourself prior to asking the tutor.
              </li>
              <li>
                Homework/classwork assignments are the students&apos;
                responsibility. We clarify concepts.
              </li>
              <li>
                No computer/internet use if it is not Math/Science related.
              </li>
              <li>
                Keep conversations down so other students can study or take
                tests.
              </li>
              <li>
                <strong>
                  Absolutely no questions or electronic devices allowed when
                  taking tests.
                </strong>{" "}
                No assistance on assessment.
              </li>
            </ol>
          </div>
        </section>
      </div>

      <div className={styles.box}>
        <h2 className={styles.boxTitle}>Mission statement</h2>
        <p className={styles.boxText}>
          Our sole purpose is to provide extra, outside classroom assistance and
          guidance so students will become independent learners, and to
          succeed.
        </p>
        <p className={styles.boxText}>
          Students can come to study or use computers for class-related works,
          but must be willing to share tutors&apos; time. Each individual
          tutoring session can last up to 15 minutes. Tutors can return for
          additional sessions after attending to other students.
        </p>
      </div>

      <div className={styles.box}>
        <p className={styles.boxText}>
          For further information, please contact:{" "}
          <span className={styles.nowrap}>(408) 274–7900, ext. 6883</span> or{" "}
          <a href="mailto:bryan.pham@evc.edu">bryan.pham@evc.edu</a>
        </p>
      </div>
    </>
  );
};

export default TutoringRules;
