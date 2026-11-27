"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ArrowLeft,
  Inbox,
  LayoutGrid,
  Printer,
} from "lucide-react";
import { SUBMISSIONS_CHANGED } from "@/lib/submissionEvents";

interface NavItem {
  name: string;
  hint: string;
  href: string;
  icon: typeof LayoutDashboard;
  step?: number;
  badge?: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  // Pending availability submissions, refreshed on navigation and whenever
  // the inbox changes one. A failure just hides the badge.
  useEffect(() => {
    const load = () =>
      fetch("/api/submissions/pending")
        .then((res) => (res.ok ? res.json() : { pending: 0 }))
        .then((data) => setPending(data.pending ?? 0))
        .catch(() => setPending(0));
    load();
    window.addEventListener(SUBMISSIONS_CHANGED, load);
    return () => window.removeEventListener(SUBMISSIONS_CHANGED, load);
  }, [pathname]);

  // In the order William works each term, numbered like the Dashboard's
  // checklist, so "step 3" is the same page in both places.
  const groups: { label: string | null; items: NavItem[] }[] = [
    {
      label: null,
      items: [
        { name: "Dashboard", hint: "Where this term stands", href: "/admin", icon: LayoutDashboard },
      ],
    },
    {
      label: "Each term",
      items: [
        { step: 1, name: "Terms & Holidays", hint: "Dates, hours, form link", href: "/admin/terms", icon: CalendarDays },
        { step: 2, name: "Tutor Availability", hint: "Approve tutors' replies", href: "/admin/availability", icon: Inbox, badge: pending },
        { step: 3, name: "Shift Planner", hint: "Place shifts, then publish", href: "/admin/planner", icon: LayoutGrid },
        { step: 4, name: "Print Schedule", hint: "Wall copy and PDF", href: "/admin/print", icon: Printer },
      ],
    },
    {
      label: "Anytime",
      items: [
        { name: "Manage Staff", hint: "Fix a tutor, add staff", href: "/admin/tutors", icon: Users },
      ],
    },
  ];

  // A tutor's own page (/admin/tutors/12) still lights up Manage Staff.
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      style={{
        width: "280px",
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "4px 0 24px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "1.2rem",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}
        >
          EVC
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            color: "#0f172a",
            margin: 0,
          }}
        >
          Admin Panel
        </h2>
      </div>

      <nav
        style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}
      >
        {groups.map((group) => (
          <div key={group.label ?? "home"} style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
            {group.label && (
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  padding: "8px 16px 4px",
                }}
              >
                {group.label}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </div>
        ))}

        <div
          style={{
            marginTop: "auto",
            borderTop: "1px solid #f1f5f9",
            paddingTop: "24px",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "#64748b",
              textDecoration: "none",
              fontSize: "0.95rem",
              padding: "12px 16px",
              borderRadius: "10px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ArrowLeft size={18} />
            Back to Public
          </Link>
        </div>
      </nav>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        color: active ? "#047857" : "#475569",
        backgroundColor: active ? "#ecfdf5" : "transparent",
        textDecoration: "none",
        padding: "10px 12px",
        borderRadius: "10px",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "#f8fafc";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {item.step ? (
        <span
          style={{
            width: "26px",
            height: "26px",
            flexShrink: 0,
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 800,
            color: active ? "white" : "#047857",
            background: active ? "#10b981" : "#ecfdf5",
            border: "1px solid #a7f3d0",
          }}
        >
          {item.step}
        </span>
      ) : (
        <span style={{ width: "26px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} />
        </span>
      )}
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontWeight: active ? 700 : 600, fontSize: "0.97rem" }}>
          {item.name}
        </span>
        <span style={{ fontSize: "0.78rem", color: active ? "#059669" : "#94a3b8", lineHeight: 1.3 }}>
          {item.hint}
        </span>
      </span>
      {item.badge ? (
        <span
          title={`${item.badge} waiting`}
          style={{
            marginLeft: "auto",
            minWidth: "22px",
            padding: "2px 7px",
            borderRadius: "999px",
            background: "#f59e0b",
            color: "white",
            fontSize: "0.75rem",
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}
