import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import TutoringRules from "@/components/TutoringRules";
import { getActiveTermSafe } from "@/lib/activeTerm";
import styles from "@/components/PublicPage.module.css";

// See src/app/page.tsx: keeps the term heading from freezing at build time.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tutoring Rules | EVC Tutor Schedule",
};

const TutoringRulesPage = async () => {
  // Read server-side so the heading never flashes a placeholder term name.
  const term = await getActiveTermSafe();

  return (
    <PublicPage
      title={
        <>
          General information &amp; MSRC{" "}
          <span className={styles.nowrap}>(Room MS-112)</span> rules
        </>
      }
      lede={
        <>
          The <strong>MATH and SCIENCE RESOURCE CENTER (MSRC)</strong> provides
          tutoring and student learning resources to support all EVC Astronomy,
          Biology, Chemistry, Computer Science, Math, and Physics courses.
          Tutoring is offered free on a drop-in, open-lab basis to registered
          EVC students.
        </>
      }
    >
      <TutoringRules term={term} />
    </PublicPage>
  );
};

export default TutoringRulesPage;
