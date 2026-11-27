import type { Metadata } from "next";
import PublicPage from "@/components/PublicPage";
import PublicAvailabilityForm from "@/components/availability/PublicAvailabilityForm";
import { prisma } from "@/lib/client";
import { toBuildingHours } from "@/utils/centerHours";
import sign from "@/components/SchedulePage.module.css";
import styles from "@/components/PublicPage.module.css";

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

  if (!term || !code) {
    return (
      <PublicPage title="Tutor availability">
        <div className={sign.notice} role="status">
          <h2 className={sign.noticeTitle}>
            This form is closed or your link is incomplete.
          </h2>
          <p className={sign.noticeText}>
            Use the full link from William&apos;s email. If the form has closed
            and you still need to send your availability, email{" "}
            <a href="mailto:william.nguyen@evc.edu">william.nguyen@evc.edu</a>.
          </p>
        </div>
      </PublicPage>
    );
  }

  return (
    <PublicPage
      title={`${term.name} tutor availability`}
      lede={
        <>
          If you want to tutor at EVC in <strong>{term.name}</strong>
          {" "}and are taking 6 units or more, fill in this form instead of replying to
          William&apos;s email. He uses it to build your schedule. If you send
          it again with the same student ID, the new one replaces the old one.
        </>
      }
    >
      <div className={styles.form}>
        <PublicAvailabilityForm
          code={code}
          termName={term.name}
          hours={toBuildingHours(term.buildingHours)}
        />
      </div>
    </PublicPage>
  );
}
