"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useToast } from "@/components/admin/ToastProvider";
import { rememberTerm } from "@/lib/rememberedTerm";

/**
 * The Dashboard's few interactive bits. The checklist itself is drawn on the
 * server (admin/page.tsx); these only switch terms, copy the form link and
 * open a step on the same term.
 */

export function ChecklistTermPicker({
  terms,
  selectedId,
}: {
  terms: { id: number; name: string }[];
  selectedId: number;
}) {
  const router = useRouter();
  if (terms.length < 2) return null;
  return (
    <label
      style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#475569", fontWeight: 600 }}
    >
      Term
      <select
        value={selectedId}
        onChange={(e) => router.push(`/admin?term=${e.target.value}`)}
        style={{
          padding: "8px 12px",
          borderRadius: "10px",
          border: "1px solid #cbd5e1",
          background: "white",
          color: "#0f172a",
          fontSize: "0.95rem",
          fontWeight: 600,
        }}
      >
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Opens a step's page on this term: the planner and Tutor Availability open
 * on the term William last picked, so pick it for him on the way.
 */
export function StepLink({
  href,
  termId,
  label,
  primary,
}: {
  href: string;
  termId: number;
  label: string;
  primary: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={() => rememberTerm(termId)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 18px",
        borderRadius: "10px",
        fontWeight: 600,
        fontSize: "0.95rem",
        textDecoration: "none",
        whiteSpace: "nowrap",
        background: primary ? "#10b981" : "white",
        color: primary ? "white" : "#047857",
        border: primary ? "1px solid #10b981" : "1px solid #a7f3d0",
      }}
    >
      {label}
      <ArrowRight size={16} />
    </Link>
  );
}

// The Clipboard API can reject, or wait forever on a permission prompt, so
// give it a moment and then report honestly whether the copy happened.
function copyToClipboard(text: string): Promise<boolean> {
  return Promise.race([
    navigator.clipboard
      ? navigator.clipboard.writeText(text).then(
          () => true,
          () => false,
        )
      : Promise.resolve(false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
  ]);
}

// The site's address never changes while the page is open.
const noChanges = () => () => {};

export function CopyFormLink({ code }: { code: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  // The site's address is only known in the browser, so the server's copy
  // shows the path and the full link fills in once the page loads.
  const origin = useSyncExternalStore(
    noChanges,
    () => window.location.origin,
    () => "",
  );
  const link = `${origin}/availability?code=${encodeURIComponent(code)}`;

  const copy = async () => {
    if (await copyToClipboard(link)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Link copied. Paste it into your email to tutors.", "success");
    } else {
      showToast("Couldn't copy. Select the link and copy it by hand.", "error");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px",
        marginTop: "14px",
        padding: "12px 14px",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "12px",
      }}
    >
      <code
        style={{
          flex: "1 1 260px",
          minWidth: 0,
          overflowWrap: "anywhere",
          fontSize: "0.85rem",
          color: "#065f46",
          userSelect: "all",
        }}
      >
        {link}
      </code>
      <button
        type="button"
        onClick={copy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          borderRadius: "10px",
          border: "1px solid #10b981",
          background: copied ? "#ecfdf5" : "#10b981",
          color: copied ? "#047857" : "white",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
