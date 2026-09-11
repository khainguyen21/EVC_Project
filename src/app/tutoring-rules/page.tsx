import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TutoringRules from "@/components/TutoringRules";
import ScrollToTop from "@/components/ScrollToTop";
import { getActiveTermSafe } from "@/lib/activeTerm";

// See src/app/page.tsx: keeps the term heading from freezing at build time.
export const revalidate = 60;

const TutoringRulesPage = async () => {
  // Read server-side so the heading never flashes a placeholder term name.
  const term = await getActiveTermSafe();

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

        <TutoringRules term={term} />
      </main>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default TutoringRulesPage;
