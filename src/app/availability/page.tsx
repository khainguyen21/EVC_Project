import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InfoSection from "@/components/InfoSection";
import PublicAvailabilityForm from "@/components/availability/PublicAvailabilityForm";
import { prisma } from "@/lib/client";
import { toBuildingHours } from "@/utils/centerHours";

// The code in the link decides which term (if any) the form is for, and
// William can close it at any moment, so never cache this page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tutor Availability | EVC Tutor Schedule",
  // Reached only through William's emailed link.
  robots: { index: false, follow: false },
};

async function findOpenTerm(code: string | undefined) {
  if (!code) return null;
  try {
    return await prisma.term.findUnique({
      where: { availabilityCode: code },
      select: { name: true, buildingHours: true },
    });
  } catch (error) {
    console.error("[availability page]", error);
    return null;
  }
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const raw = (await searchParams).code;
  const code = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  const term = await findOpenTerm(code);

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

        {term && code ? (
          <InfoSection
            title={`${term.name} Tutor Availability`}
            intro={
              <>
                If you want to tutor at EVC in <strong>{term.name}</strong>{" "}
                and are taking 6 units or more, fill in this form instead of replying to
                William&apos;s email. He uses it to build your schedule. If you
                send it again with the same student ID, the new one replaces the
                old one.
              </>
            }
          >
            <PublicAvailabilityForm
              code={code}
              termName={term.name}
              hours={toBuildingHours(term.buildingHours)}
            />
          </InfoSection>
        ) : (
          <InfoSection title="Tutor Availability">
            <p style={{ lineHeight: 1.7, color: "var(--text-primary)" }}>
              <strong>This form is closed or your link is incomplete.</strong>{" "}
              Use the full link from William&apos;s email. If the form has
              closed and you still need to send your availability, email{" "}
              <a
                href="mailto:william.nguyen@evc.edu"
                style={{ color: "var(--accent-green)", fontWeight: 600 }}
              >
                william.nguyen@evc.edu
              </a>
              .
            </p>
          </InfoSection>
        )}
      </main>
      <Footer />
    </div>
  );
}
