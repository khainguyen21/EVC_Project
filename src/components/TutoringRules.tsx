import InfoSection from "./InfoSection";

const TutoringRules = () => {
  return (
    <InfoSection
      title="General Information & MSRC (Room MS-112) Rules"
      intro={
        <>
          The <strong>MATH and SCIENCE RESOURCE CENTER (MSRC)</strong> provides
          tutoring and student learning resources to support all EVC Astronomy,
          Biology, Chemistry, Computer Science, Math, and Physics courses.
          Tutoring is offered free on a drop-in, open-lab basis to registered
          EVC students.
        </>
      }
    >
      <div className="rules-grid" style={{ display: "grid", gap: "24px" }}>
        <div className="rules-column">
          <h3
            style={{
              color: "var(--primary-color)",
              margin: "0 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            Spring 2026 Hours
          </h3>

          <ul className="info-section__list">
            <li className="info-section__list-item">
              <strong>Monday:</strong> 9:00 am – 6:00 pm
            </li>
            <li className="info-section__list-item">
              <strong>Tuesday - Thursday:</strong> 9:00 am – 8:00 pm
            </li>
            <li className="info-section__list-item">
              <strong>Friday:</strong> 9:00 am – 5:00 pm
            </li>
            <li className="info-section__list-item">
              <strong>Saturday, Sunday:</strong> CLOSED
            </li>
          </ul>

          <h3
            style={{
              color: "var(--primary-color)",
              margin: "24px 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            Registration & Use
          </h3>
          <p
            style={{
              marginBottom: "12px",
              lineHeight: 1.6,
              fontSize: "0.95rem",
            }}
          >
            All eligible students must register for a noncredit{" "}
            <strong>II-210 Supervised Tutoring</strong> section prior to
            attending.
          </p>
          <div className="requirement-card" style={{ marginBottom: "8px" }}>
            <strong>Courses (Reg ID):</strong> II-210-207 (130387), II-210-208 (130388)
            , II-210-209 (130389)
          </div>
          <div className="requirement-card" style={{ marginBottom: "8px" }}>
            No fee, no units, no grades.
          </div>
          <div className="requirement-card" style={{ marginBottom: "8px" }}>
            Use your Student ID number to log in/out every time. Unregistered
            students are not allowed.
          </div>
          <div className="requirement-card" style={{ marginBottom: "8px" }}>
            Picture ID required to check out materials (calculators, laptops,
            textbooks).
          </div>
        </div>

        <div className="rules-column">
          <h3
            style={{
              color: "var(--primary-color)",
              margin: "0 0 12px 0",
              fontSize: "1.1rem",
            }}
          >
            Dos and Don'ts
          </h3>
          <ol className="nettutor-steps" style={{ marginTop: 0 }}>
            <li>Log-in and log-out every time you use the center.</li>
            <li>No food, drinks, children, or pets allowed.</li>
            <li>Please set cell phones on vibrate and talk outside.</li>
            <li>Do not copy from solution manuals.</li>
            <li>
              Please try the problem first yourself prior to asking the tutor.
            </li>
            <li>
              Homework/classwork assignments are the students' responsibility.
              We clarify concepts.
            </li>
            <li>No computer/internet use if it is not Math/Science related.</li>
            <li>
              Keep conversations down so other students can study or take tests.
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
      </div>

      <div className="info-section__highlight" style={{ marginTop: "24px" }}>
        <h3>Mission Statement</h3>
        <p style={{ marginBottom: "8px" }}>
          Our sole purpose is to provide extra, outside classroom assistance and
          guidance so students will become independent learners, and to succeed.
        </p>
        <p>
          Students can come to study or use computers for class-related works,
          but must be willing to share tutors' time. Each individual tutoring
          session can last up to 15 minutes. Tutors can return for additional
          sessions after attending to other students.
        </p>
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "var(--background-secondary)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-primary)",
            marginBottom: "8px",
          }}
        >
          For further information, please contact:
        </p>
        <p style={{ fontWeight: 600, color: "var(--primary-color)" }}>
          (408) 274–7900, ext. 6883
          <br />
          <a
            href="mailto:bryan.pham@evc.edu"
            style={{ color: "var(--accent-blue)", textDecoration: "none" }}
          >
            bryan.pham@evc.edu
          </a>
        </p>
      </div>
    </InfoSection>
  );
};

export default TutoringRules;
