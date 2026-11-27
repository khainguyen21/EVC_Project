import type { Metadata } from "next";
import { BadgeDollarSign, Check } from "lucide-react";
import PublicPage from "@/components/PublicPage";
import sign from "@/components/SchedulePage.module.css";
import styles from "@/components/PublicPage.module.css";

export const metadata: Metadata = {
  title: "Become a Tutor | EVC Tutor Schedule",
};

const BENEFITS: [strong: string, rest: string][] = [
  ["Help others", "while being paid"],
  ["Enhance your knowledge", "of the subject"],
  ["Develop and improve", "your communication skills"],
  ["Enhance your resume", "with valuable experience"],
  ["Gain insights", "into teaching as a career"],
  ["Gain experience", "in a leadership role"],
  ["Work on campus", "with a flexible schedule"],
];

const REQUIREMENTS = [
  "Must be at least 18 years old and currently registered for at least 6 units at EVC/SJCC",
  "Must have earned an “A” grade in the subject you want to tutor",
  "Must get an instructor’s recommendation for subject (can be by email after hired)",
  "Must have a minimum overall GPA of 3.0",
  "Must be able to communicate effectively",
  "Must have a Social Security Number for hiring paperwork",
];

const BecomeATutorPage = () => (
  <PublicPage
    title="Become an EVC tutor"
    lede={
      <>
        This is a great way to refresh your knowledge, earn money, help fellow
        students, and work a weekly schedule based on{" "}
        <strong>YOUR AVAILABILITY</strong>.
      </>
    }
  >
    <div className={styles.callout}>
      <h2 className={styles.boxTitle}>
        <BadgeDollarSign
          className={styles.boxTitleIcon}
          size={24}
          aria-hidden="true"
        />
        Compensation: $18.00/hour
      </h2>
      <p className={styles.boxText}>
        <strong>Subjects we&apos;re hiring for:</strong> Accounting 1A/B • Math
        22, 61, 62, 63, 71, 72, 73 • Physics 2A/B, 7A/B • Spanish 1A/B
      </p>
    </div>

    <section className={styles.section} aria-labelledby="benefits-title">
      <div className={sign.subjectHead}>
        <h2 id="benefits-title" className={sign.subjectTitle}>
          Benefits of being a tutor
        </h2>
      </div>
      <ul className={styles.checks}>
        {BENEFITS.map(([strong, rest]) => (
          <li key={strong} className={styles.check}>
            <Check className={styles.checkIcon} size={18} aria-hidden="true" />
            <span>
              <strong>{strong}</strong> {rest}
            </span>
          </li>
        ))}
      </ul>
    </section>

    <section className={styles.section} aria-labelledby="requirements-title">
      <div className={sign.subjectHead}>
        <h2 id="requirements-title" className={sign.subjectTitle}>
          Requirements
        </h2>
      </div>
      <ul className={styles.checks}>
        {REQUIREMENTS.map((text) => (
          <li key={text} className={styles.check}>
            <Check className={styles.checkIcon} size={18} aria-hidden="true" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>

    <div className={styles.box}>
      <p className={styles.boxText}>
        <strong>Interested?</strong> Email the Tutoring Coordinator at{" "}
        <a href="mailto:Sarai.Minjares@evc.edu">Sarai.Minjares@evc.edu</a> or
        Tutoring Instructor at{" "}
        <a href="mailto:william.nguyen@evc.edu">william.nguyen@evc.edu</a>
      </p>
      <p className={styles.boxText}>
        <strong>Already a tutor?</strong> Use the availability link William
        emails before each term to send your subjects and hours.
      </p>
    </div>
  </PublicPage>
);

export default BecomeATutorPage;
