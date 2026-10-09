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
} from "lucide-react";
import { SUBMISSIONS_CHANGED } from "@/lib/submissionEvents";

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

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Manage Staff", href: "/admin/tutors", icon: Users },
    {
      name: "Tutor Availability",
      href: "/admin/availability",
      icon: Inbox,
      badge: pending,
    },
    { name: "Shift Planner", href: "/admin/planner", icon: LayoutGrid },
    { name: "Terms & Holidays", href: "/admin/terms", icon: CalendarDays },
  ];

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
          marginBottom: "48px",
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
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: isActive ? "#10b981" : "#475569",
                backgroundColor: isActive ? "#ecfdf5" : "transparent",
                textDecoration: "none",
                fontWeight: isActive ? "600" : "500",
                padding: "12px 16px",
                borderRadius: "10px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon size={20} />
              {item.name}
              {"badge" in item && item.badge ? (
                <span
                  title={`${item.badge} pending`}
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
        })}

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
