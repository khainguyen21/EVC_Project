"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TutoringRules from "@/components/TutoringRules";
import ScrollToTop from "@/components/ScrollToTop";

const TutoringRulesPage = () => {
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

        <TutoringRules />
      </main>

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default TutoringRulesPage;
