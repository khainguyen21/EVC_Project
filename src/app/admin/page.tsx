import { logout } from '@/app/actions/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, AlertTriangle, Users, CheckCircle2, Circle, CircleDashed, Clock, CalendarPlus, Globe } from 'lucide-react'
import { prisma } from '@/lib/client'
import { getSession } from '@/lib/session'
import { getActiveTermSafe } from '@/lib/activeTerm'
import { TERM_INCLUDE, serializeTerm } from '@/lib/terms'
import { loadPublishPlan } from '@/lib/publish'
import { getCampusNow } from '@/utils/availability'
import { formatTermDate, getTermLifecycle } from '@/utils/term'
import { samePublicRows } from '@/utils/publish'
import {
  buildChecklist,
  buildingsWithHours,
  needsNextTerm,
  pickChecklistTerm,
  shortDate,
  termStatus,
  termToWaitFor,
  termsForOverview,
  type ChecklistInput,
  type ChecklistStep,
  type StepState,
  type TermStatusKind,
} from '@/utils/adminChecklist'
import type { PublicTutorRow } from '@/utils/publish'
import { ChecklistTermPicker, CopyFormLink, StepLink } from '@/components/admin/DashboardChecklist'

// The admin must always see the real current state — never a build-time
// snapshot of which term is active.
export const dynamic = 'force-dynamic'

const STATE_STYLE: Record<StepState, { label: string; color: string; bg: string; border: string }> = {
  done: { label: 'Done', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  todo: { label: 'To do', color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  waiting: { label: 'Not yet', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
}

type OverviewTerm = ReturnType<typeof serializeTerm> & { availabilityCode: string | null }

/** Everything the checklist needs for one term, read from the database. */
const TERM_STATUS_STYLE: Record<TermStatusKind, { color: string; bg: string; border: string; Icon: typeof Circle }> = {
  done: { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', Icon: CheckCircle2 },
  attention: { color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', Icon: AlertTriangle },
  progress: { color: '#b45309', bg: '#fffbeb', border: '#fcd34d', Icon: Circle },
  waiting: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', Icon: Clock },
  notStarted: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', Icon: CircleDashed },
}

async function loadChecklistInput(
  term: OverviewTerm,
  terms: OverviewTerm[],
  today: string,
  publicTermId: number | null,
): Promise<ChecklistInput> {
  const [counts, plan, lastForTerm] = await Promise.all([
    prisma.availabilitySubmission.groupBy({
      by: ['status'],
      where: { termId: term.id },
      _count: { _all: true },
    }),
    loadPublishPlan(term.id),
    prisma.publication.findFirst({
      where: { termId: term.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, published: true },
    }),
  ])
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0
  const waitFor = termToWaitFor(term, terms, today)
  return {
    term: {
      ...term,
      holidayCount: term.holidays.length,
      buildingsWithHours: buildingsWithHours(term.buildingHours),
    },
    replies: { pending: count('pending'), approved: count('approved'), declined: count('declined') },
    plan: {
      withShifts: plan.tutors.length,
      approvedNoShifts: plan.noShifts.length,
      needsReview: plan.needsReview.length,
    },
    publish: {
      lastPublishedAt: lastForTerm?.createdAt.toISOString() ?? null,
      // Only ever written by publishTerm.
      changedSince:
        lastForTerm !== null && !samePublicRows(plan.tutors, lastForTerm.published as PublicTutorRow[]),
      onPublicSite: publicTermId === term.id,
      waitFor: waitFor && { name: waitFor.name, endDate: waitFor.endDate },
    },
  }
}

async function loadChecklist(pickedId: number | null) {
  const today = getCampusNow().date
  const [rows, lastPublication] = await Promise.all([
    prisma.term.findMany({ include: TERM_INCLUDE, orderBy: { startDate: 'desc' } }),
    prisma.publication.findFirst({ orderBy: { createdAt: 'desc' }, select: { termId: true } }),
  ])
  const terms = rows.map((row) => ({ ...serializeTerm(row), availabilityCode: row.availabilityCode }))
  const term = pickChecklistTerm(terms, today, pickedId)
  if (!term) return null
  const publicTermId = lastPublication?.termId ?? null

  // The shown term is always in the overview, so its input is loaded once
  // and shared with the checklist below.
  const overviewTerms = termsForOverview(terms, today, publicTermId, term.id)
  const inputs = await Promise.all(
    overviewTerms.map((t) => loadChecklistInput(t, terms, today, publicTermId)),
  )
  const shownInput = inputs[overviewTerms.findIndex((t) => t.id === term.id)]

  return {
    term,
    terms: terms.map((t) => ({ id: t.id, name: t.name })),
    steps: buildChecklist(shownInput),
    overview: overviewTerms.map((t, i) => ({
      id: t.id,
      name: t.name,
      dates: `${shortDate(t.startDate)} to ${shortDate(t.endDate)}`,
      onPublicSite: t.id === publicTermId,
      status: termStatus(inputs[i]),
    })),
    nextTermMissing: needsNextTerm(term, terms, today),
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ term?: string | string[] }>
}) {
  // The proxy already guards /admin; checked again because this page shows
  // the private form link.
  if (!(await getSession())) redirect('/admin/login')

  const raw = (await searchParams).term
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw)
  const pickedId = Number.isInteger(parsed) && parsed > 0 ? parsed : null

  // Surfaced here because this is the first page after login: if the active
  // term has lapsed, students are seeing "Semester Over" right now.
  const activeTerm = await getActiveTermSafe()
  const lifecycle = activeTerm ? getTermLifecycle(activeTerm, getCampusNow().date) : null
  const termAlert =
    !activeTerm
      ? 'No term is active, so the homepage banner has no dates and closed days are not applied.'
      : lifecycle === 'ended'
        ? `${activeTerm.name} ended on ${formatTermDate(activeTerm.endDate)}. Students see “Semester Over” and live availability is switched off.`
        : lifecycle === 'upcoming'
          ? `${activeTerm.name} starts ${formatTermDate(activeTerm.startDate)}. Until then students see “Not Yet In Session”.`
          : null

  let checklist: Awaited<ReturnType<typeof loadChecklist>> | undefined
  try {
    checklist = await loadChecklist(pickedId)
  } catch (error) {
    console.error('[admin dashboard checklist]', error)
    checklist = undefined
  }

  const doneCount = checklist ? checklist.steps.filter((s) => s.state === 'done').length : 0
  // The first step still to do gets the green button, so the eye lands there.
  const firstTodo = checklist?.steps.find((s) => s.state === 'todo')?.number

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.03em', marginBottom: '8px' }}>
            Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '640px', lineHeight: 1.5 }}>
            Your work for each term, in order. Each step shows where things stand and opens the page to do it.
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'white',
              color: '#ef4444',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.05)',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </form>
      </div>

      {termAlert && (
        <Link
          href="/admin/terms"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            color: '#991b1b',
            textDecoration: 'none',
            lineHeight: 1.6,
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {termAlert} <strong style={{ textDecoration: 'underline' }}>Manage terms →</strong>
          </span>
        </Link>
      )}

      {checklist === undefined ? (
        <Notice>
          The checklist didn&apos;t load. Refresh the page to try again. The pages in the sidebar still work.
        </Notice>
      ) : checklist === null ? (
        <Notice>
          No terms yet. Start with step 1:{' '}
          <Link href="/admin/terms" style={{ color: '#047857', fontWeight: 700 }}>
            add a term on Terms &amp; Holidays →
          </Link>
        </Notice>
      ) : (
        <>
        <TermOverview rows={checklist.overview} shownId={checklist.term.id} />
        <section
          style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
            padding: '28px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 2px' }}>
                Working on
              </p>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {checklist.term.name}
              </h2>
              <p style={{ color: '#64748b', margin: '4px 0 0' }}>
                {doneCount} of {checklist.steps.length} steps done
              </p>
            </div>
            <ChecklistTermPicker terms={checklist.terms} selectedId={checklist.term.id} />
          </div>

          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {checklist.steps.map((step) => (
              <StepRow
                key={step.number}
                step={step}
                termId={checklist.term.id}
                primary={step.number === firstTodo}
                formCode={step.number === 1 ? checklist.term.availabilityCode : null}
              />
            ))}
          </ol>

          {checklist.nextTermMissing && (
            <p style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '20px 0 0', padding: '14px 16px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#475569', lineHeight: 1.5 }}>
              <CalendarPlus size={20} style={{ flexShrink: 0, marginTop: '1px', color: '#10b981' }} />
              <span>
                Getting ready for next term? Add it on{' '}
                <Link href="/admin/terms" style={{ color: '#047857', fontWeight: 700 }}>
                  Terms &amp; Holidays
                </Link>
                . This checklist moves to the new term once it&apos;s added.
              </span>
            </p>
          )}
        </section>
        </>
      )}

      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '20px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 320px' }}>
          <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
              Anytime: Manage Staff
            </h3>
            <p style={{ color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Fix one tutor&apos;s details on the public schedule, or add professors and staff. Not part of the steps above.
            </p>
          </div>
        </div>
        <Link
          href="/admin/tutors"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 600, textDecoration: 'none', color: '#334155', border: '1px solid #cbd5e1', background: 'white' }}
        >
          Open Manage Staff →
        </Link>
      </section>
    </div>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ padding: '20px 24px', marginBottom: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#475569', lineHeight: 1.6 }}>
      {children}
    </p>
  )
}

function StepRow({
  step,
  termId,
  primary,
  formCode,
}: {
  step: ChecklistStep
  termId: number
  primary: boolean
  formCode: string | null
}) {
  const look = STATE_STYLE[step.state]
  const Icon = step.state === 'done' ? CheckCircle2 : step.state === 'todo' ? Circle : Clock
  return (
    <li
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '18px 20px',
        borderRadius: '16px',
        border: `1px solid ${primary ? '#10b981' : '#e2e8f0'}`,
        boxShadow: primary ? '0 0 0 3px rgba(16, 185, 129, 0.12)' : 'none',
        background: step.state === 'waiting' ? '#fcfcfd' : 'white',
      }}
    >
      <div
        aria-hidden
        style={{
          width: '40px',
          height: '40px',
          flexShrink: 0,
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '1.1rem',
          color: step.state === 'done' ? 'white' : look.color,
          background: step.state === 'done' ? '#10b981' : look.bg,
          border: `2px solid ${step.state === 'done' ? '#10b981' : look.border}`,
        }}
      >
        {step.state === 'done' ? <CheckCircle2 size={22} /> : step.number}
      </div>

      <div style={{ flex: '1 1 280px', minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px', marginBottom: '6px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Step {step.number}.</span> {step.title}
          </h3>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: look.color,
              background: look.bg,
              border: `1px solid ${look.border}`,
            }}
          >
            <Icon size={13} /> {look.label}
          </span>
        </div>
        <p style={{ margin: 0, color: step.state === 'waiting' ? '#64748b' : '#334155', lineHeight: 1.5 }}>{step.summary}</p>
        {step.details.length > 0 && (
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
            {step.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        {formCode && <CopyFormLink code={formCode} />}
      </div>

      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <StepLink href={step.href} termId={termId} label={step.linkLabel} primary={primary} />
      </div>
    </li>
  )
}

type OverviewRow = NonNullable<Awaited<ReturnType<typeof loadChecklist>>>['overview'][number]

/**
 * Every current term at a glance, so the one that needs work stands out and
 * it's obvious which term the checklist below is for. Each row opens that
 * term's checklist.
 */
function TermOverview({ rows, shownId }: { rows: OverviewRow[]; shownId: number }) {
  if (rows.length < 2) return null
  return (
    <section
      aria-labelledby="your-terms"
      style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
        padding: '20px 24px',
        marginBottom: '24px',
      }}
    >
      <h2 id="your-terms" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
        Your terms
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map((row) => {
          const shown = row.id === shownId
          const look = TERM_STATUS_STYLE[row.status.kind]
          return (
            <li key={row.id}>
              <Link
                href={`/admin?term=${row.id}`}
                aria-current={shown ? 'true' : undefined}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px 16px',
                  padding: '12px 16px',
                  borderRadius: '14px',
                  textDecoration: 'none',
                  border: `${shown ? 2 : 1}px solid ${shown ? '#10b981' : '#e2e8f0'}`,
                  background: shown ? '#f0fdf4' : 'white',
                }}
              >
                <span style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, color: '#0f172a' }}>{row.name}</span>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: '#64748b' }}>{row.dates}</span>
                </span>
                {row.onPublicSite && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>
                    <Globe size={14} /> On the website
                  </span>
                )}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: look.color,
                    background: look.bg,
                    border: `1px solid ${look.border}`,
                  }}
                >
                  <look.Icon size={14} /> {row.status.label}
                </span>
                <span style={{ flex: '0 0 auto', fontSize: '0.85rem', fontWeight: 700, color: shown ? '#047857' : '#94a3b8' }}>
                  {shown ? 'Showing below' : 'Open →'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
