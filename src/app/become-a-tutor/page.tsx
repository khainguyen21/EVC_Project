"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoSection from "@/components/InfoSection";
import ScrollToTop from "@/components/ScrollToTop";

const BecomeATutorPage = () => {
  return (
    <div className="container">
      <Header />
      <main>
        <div style={{ marginBottom: "20px" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--accent-green)",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.95rem",
            }}
          >
            ← Back to Schedule
          </Link>
        </div>
        <InfoSection
          title="Become an EVC Tutor"
          intro={
            <>
              This is a great way to refresh your knowledge, earn money, help
              fellow students, and work a weekly schedule based on{" "}
              <strong>YOUR AVAILABILITY</strong>.
            </>
          }
        >
          <div className="info-section__highlight">
            <h3>Compensation: $18.00/hour</h3>
            <p>
              <strong>Subjects we&apos;re hiring for:</strong> Accounting 1A/B •
              Math 22, 61, 62, 63, 71, 72, 73 • Physics 2A/B, 7A/B • Spanish
              1A/B
            </p>
          </div>
          <h3
            style={{
              color: "var(--primary-color)",
              margin: "20px 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            Benefits of Being a Tutor
          </h3>
          <ul className="info-section__list">
            <li className="info-section__list-item">
              <strong>Help others</strong> while being paid
            </li>
            <li className="info-section__list-item">
              <strong>Enhance your knowledge</strong> of the subject
            </li>
            <li className="info-section__list-item">
              <strong>Develop and improve</strong> your communication skills
            </li>
            <li className="info-section__list-item">
              <strong>Enhance your resume</strong> with valuable experience
            </li>
            <li className="info-section__list-item">
              <strong>Gain insights</strong> into teaching as a career
            </li>
            <li className="info-section__list-item">
              <strong>Gain experience</strong> in a leadership role
            </li>
            <li className="info-section__list-item">
              <strong>Work on campus</strong> with a flexible schedule
            </li>
          </ul>

          <h3
            style={{
              color: "var(--primary-color)",
              margin: "20px 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            Requirements
          </h3>
          <div className="info-section__requirements">
            <div className="requirement-card">
              Must be at least 18 years old and currently registered for at
              least 6 units at EVC/SJCC
            </div>
            <div className="requirement-card">
              Must have earned an &quot;A&quot; grade in the subject you want to
              tutor
            </div>
            <div className="requirement-card">
              Must get an instructor&apos;s recommendation for subject (can be
              by email after hired)
            </div>
            <div className="requirement-card">
              Must have a minimum overall GPA of 3.0
            </div>
            <div className="requirement-card">
              Must be able to communicate effectively
            </div>
            <div className="requirement-card">
              Must have a Social Security Number for hiring paperwork
            </div>
          </div>

          <p
            style={{
              marginTop: "20px",
              fontSize: "0.95rem",
              color: "var(--text-secondary)",
            }}
          >
            <strong>Interested?</strong> Email the Tutoring Coordinator at{" "}
            <a
              href="mailto:Sarai.Minjares@evc.edu"
              style={{ color: "var(--accent-green)", fontWeight: 600 }}
            >
              Sarai.Minjares@evc.edu
            </a>{" "}
            or Tutoring Instructor at{" "}
            <a
              href="mailto:william.nguyen@evc.edu"
              style={{ color: "var(--accent-green)", fontWeight: 600 }}
            >
              william.nguyen@evc.edu
            </a>
          </p>
        </InfoSection>
      </main>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default BecomeATutorPage;
