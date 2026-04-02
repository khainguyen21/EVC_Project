# EVC Tutor Schedule → Full-Stack Roadmap for Snap Engineering Academy

A step-by-step plan to transform your existing React project into a full-stack application with admin dashboard, database, and APIs — aligned with Snap's preferred qualifications.

---

## How Your Project Maps to Snap's Requirements

| Snap Requirement | What You Already Have | What You'll Build |
|------------------|----------------------|-------------------|
| **Full-stack/end-to-end projects** | ✅ React front-end deployed on Vercel | 🆕 Back-end API + PostgreSQL database + Admin dashboard |
| **Frontend, backend, APIs, databases** | ✅ React, TypeScript, routing | 🆕 Next.js API routes, Prisma ORM, PostgreSQL |
| **HTML, CSS, modern JS frameworks** | ✅ React 18, TypeScript, CSS | ✅ Already covered |
| **Data structures & algorithms** | ⚠️ Basic usage in your code | 🆕 Add search/filter algorithms, practice separately |
| **Product thinking, UX** | ✅ Beautiful UI, dark mode, filtering | 🆕 Admin UX for William |

---

## The Full-Stack Architecture You'll Build

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
├─────────────────────────────┬───────────────────────────────────┤
│   Students (Public)         │   William (Admin)                 │
│   yourapp.com/              │   yourapp.com/admin               │
│   - View tutor schedules    │   - Login with email/password     │
│   - Filter by subject/day   │   - Add/Edit/Delete tutors        │
│   - Read-only               │   - Manage schedules              │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                          │
│                                                                 │
│  ┌─── Pages (React) ───────────────────────────────────────┐   │
│  │  /              → Public schedule (your current App.tsx) │   │
│  │  /admin         → Admin dashboard (new)                  │   │
│  │  /admin/tutors  → Tutor management CRUD (new)            │   │
│  │  /api/auth      → Authentication endpoints (new)         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─── API Routes (Back-end) ───────────────────────────────┐   │
│  │  GET    /api/tutors      → List all tutors               │   │
│  │  POST   /api/tutors      → Create new tutor              │   │
│  │  PUT    /api/tutors/:id  → Update tutor                  │   │
│  │  DELETE /api/tutors/:id  → Delete tutor                  │   │
│  │  GET    /api/schedules   → List schedules                │   │
│  │  POST   /api/schedules   → Add schedule slot             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                         Prisma ORM                              │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                          │
│                    (Supabase - free tier)                       │
│                                                                 │
│  ┌─ User ─────────────────────────────────────────────────┐    │
│  │ id │ email              │ password_hash │ role         │    │
│  │ 1  │ william@evc.edu    │ ************  │ admin        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Tutor ────────────────────────────────────────────────┐    │
│  │ id │ name         │ type      │ role                   │    │
│  │ 1  │ Brandon Ong  │ tutor     │ null                   │    │
│  │ 2  │ Prof. Yee    │ professor │ null                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Subject ──────────────────────────────────────────────┐    │
│  │ id │ tutor_id │ name      │ field                      │    │
│  │ 1  │ 1        │ BIOL 020  │ Biology                    │    │
│  │ 2  │ 1        │ BIOL 071  │ Biology                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Schedule ─────────────────────────────────────────────┐    │
│  │ id │ tutor_id │ day   │ start │ end   │ location       │    │
│  │ 1  │ 1        │ Wed   │ 11:00 │ 15:00 │ SQ-231         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase-by-Phase Roadmap

### Phase 1: Migrate to Next.js (Week 1-2)
**Goal:** Same functionality, but on Next.js framework

| Task | What You'll Learn | Snap Skill |
|------|-------------------|------------|
| Create new Next.js project | Next.js App Router | Modern JS frameworks |
| Move your React components over | Component reusability | Frontend |
| Set up routing (`/`, `/become-a-tutor`) | File-based routing | Frontend |
| Keep fetching from `schedule.json` for now | Data fetching patterns | Frontend |

**Deliverable:** Your app works exactly the same, but runs on Next.js.

### Phase 2: Add Database + API (Week 3-4)
**Goal:** Replace `schedule.json` with a real database

| Task | What You'll Learn | Snap Skill |
|------|-------------------|------------|
| Set up Supabase (free PostgreSQL) | Database setup | Databases |
| Design schema (tutors, subjects, schedules) | Database design, relationships | Databases |
| Install Prisma ORM | ORM concepts | Backend |
| Create API route: `GET /api/tutors` | REST API design | APIs |
| Update front-end to fetch from API | API integration | Full-stack |
| Seed database with your current JSON data | Data migration | Backend |

**Deliverable:** Public schedule now reads from database via API.

### Phase 3: Admin Authentication (Week 5)
**Goal:** Secure login for William

| Task | What You'll Learn | Snap Skill |
|------|-------------------|------------|
| Install NextAuth.js | Authentication patterns | Backend, Security |
| Create login page (`/admin/login`) | Form handling, validation | Frontend |
| Protect admin routes (middleware) | Authorization, middleware | Backend |
| Store user in database | User management | Databases |

**Deliverable:** William can log in; unauthorized users can't access admin.

### Phase 4: Admin Dashboard CRUD (Week 6-8)
**Goal:** William can manage tutors without code

| Task | What You'll Learn | Snap Skill |
|------|-------------------|------------|
| Create admin layout + navigation | Dashboard UX | Product thinking |
| Build tutor list page (`/admin/tutors`) | Data tables, pagination | Frontend |
| Build "Add Tutor" form | Form handling, validation | Frontend |
| Create `POST /api/tutors` endpoint | Create operations | APIs |
| Build "Edit Tutor" page | Update operations | Full-stack |
| Create `PUT /api/tutors/:id` endpoint | Update operations | APIs |
| Add "Delete" with confirmation | Delete operations, UX | Full-stack |
| Create `DELETE /api/tutors/:id` endpoint | Delete operations | APIs |
| Manage schedules per tutor | Nested CRUD, relationships | Full-stack |

**Deliverable:** Full admin dashboard — William can add/edit/delete tutors and schedules.

### Phase 5: Polish & Deploy (Week 9)
**Goal:** Production-ready application

| Task | What You'll Learn | Snap Skill |
|------|-------------------|------------|
| Add loading states, error handling | UX polish | Product thinking |
| Add form validation (Zod) | Data validation | Backend |
| Add success/error toast notifications | User feedback | UX |
| Test all CRUD operations | Testing mindset | Full-stack |
| Deploy to Vercel with database | Deployment, environment variables | DevOps |

**Deliverable:** Live, production-ready full-stack app.

---

## Data Structures & Algorithms Practice (For Snap Interview)

Your project uses some algorithms already. Here's how to strengthen this:

| In Your Project | Algorithm/DS Concept | How to Improve |
|-----------------|---------------------|----------------|
| `sortTutorsByType()` | Sorting, comparators | Implement your own sort (merge sort, quick sort) |
| `getUniqueFields()` | Sets, deduplication | Understand Set data structure |
| `filterSubjectsByField()` | Filtering, iteration | Practice filter/map/reduce |
| `formatSubjectsForDisplay()` | String manipulation, grouping | Practice regex, parsing |
| `groupedByField` object | Hash maps | Understand O(1) lookup |
| Future: search by name | String matching | Implement binary search, trie |

**Separate practice:** Use LeetCode/NeetCode for trees, graphs, recursion, Big-O. Aim for 2-3 easy/medium problems per week.

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | Next.js 14 (App Router) | Full-stack React, API routes, industry standard |
| **Language** | TypeScript | You already use it, type safety |
| **Database** | PostgreSQL (Supabase) | Free tier, industry standard |
| **ORM** | Prisma | Type-safe queries, easy migrations |
| **Auth** | NextAuth.js (Auth.js) | Simple, secure, Next.js native |
| **Styling** | Your existing CSS | No changes needed |
| **Hosting** | Vercel | Free, automatic deploys |

---

## What You'll Be Able to Say in Your Snap Application

After completing this project:

> "I built a full-stack tutor scheduling application for my college's tutoring center. The front-end uses **React with TypeScript** and features filtering, dark mode, and responsive design. The back-end uses **Next.js API routes** with **Prisma ORM** connected to a **PostgreSQL database**. I implemented **authentication with NextAuth.js** to protect the admin dashboard, where staff can perform full **CRUD operations** on tutors and schedules. The app is deployed on **Vercel** and actively used by the tutoring department."

This checks every box in Snap's preferred qualifications.

---

## Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| 1. Migrate to Next.js | 1-2 weeks | App runs on Next.js |
| 2. Database + API | 2 weeks | Data from PostgreSQL |
| 3. Authentication | 1 week | Admin login works |
| 4. Admin CRUD | 2-3 weeks | Full dashboard |
| 5. Polish & Deploy | 1 week | Production ready |
| **Total** | **7-9 weeks** | **Full-stack app** |

---

## First Steps (This Week)

1. **Create a new branch** for the Next.js migration: `git checkout -b nextjs-migration`
2. **Initialize Next.js** in a new folder or convert existing project
3. **Move your components** one by one, testing as you go
4. **Keep `schedule.json`** working initially — database comes in Phase 2

Ready to start? Let me know and I'll guide you through Phase 1 step by step.
