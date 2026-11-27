"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nothing else on the site leads to these pages, so every public page lists
// them here. The schedule is left out: the sign's logo already goes there.
const LINKS = [
  { href: "/tutoring-rules", label: "Tutoring rules & hours" },
  { href: "/become-a-tutor", label: "Become a tutor" },
];

const Footer = () => {
  const pathname = usePathname();

  return (
    <footer className="footer">
      <nav aria-label="More pages">
        <ul className="footer__links">
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="footer__link"
                aria-current={pathname === href ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p>
        EVC Tutor Schedule &copy; {new Date().getFullYear()} | Built for
        students by a student
      </p>
    </footer>
  );
};

export default Footer;
