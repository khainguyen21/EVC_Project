import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SignTop from "@/components/SignTop";
import { overpass } from "@/components/fonts";
import sign from "@/components/SchedulePage.module.css";
import styles from "@/components/PublicPage.module.css";

interface Props {
  /** The page's name, shown large on the green sign. */
  title: React.ReactNode;
  /** A sentence or two under the title, still on the sign. */
  lede?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The frame every public page but the schedule shares: the schedule's green
 * sign at the top (smaller, with this page's name), a way back to the
 * schedule, then the page's own content.
 */
const PublicPage = ({ title, lede, children }: Props) => (
  <div className={`${overpass.variable} ${sign.page} ${styles.frame}`}>
    <div className={`${sign.inner} ${styles.grow}`}>
      <header className={sign.sign}>
        <div className={sign.signFrame}>
          <SignTop logoHref="/" />
          <h1 className={`${sign.title} ${styles.title}`}>{title}</h1>
          {lede && <p className={sign.lede}>{lede}</p>}
        </div>
      </header>

      <Link href="/" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to schedule
      </Link>

      <main className={styles.main}>{children}</main>
    </div>

    <ScrollToTop />
    <Footer />
  </div>
);

export default PublicPage;
