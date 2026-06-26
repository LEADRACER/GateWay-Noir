# Myth:GateWay 🏛️

> Where myths enter, verdicts exit.

A crowd-sourced platform for investigating conspiracies and myths. Every myth enters the Gate, gets debated with timed case files, and receives a community-driven verdict.

## Features

- **Timed Case Files** — Each topic has a countdown timer (1–30 days). When time's up, an admin delivers the verdict.
- **Anonymous Participation** — No login required. Users get a random ID with a deterministic color avatar.
- **Verdict System** — Three verdicts: **BUSTED**, **TRUE**, or **INCONCLUSIVE** with an admin-written summary.
- **Upcoming Topics Voting** — Vote on upcoming topics to decide what gets investigated next.
- **Comment Moderation** — Flag/review/delete comments from the admin panel.
- **Admin Dashboard** — Stats overview, create/conclude topics, moderate comments.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Prisma + SQLite |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Icons | Lucide React |

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing + card grid + category filter + upcoming topics |
| `/topic/[slug]` | Topic detail + live countdown + comments + verdict |
| `/admin` | Dashboard (stats, active/concluded counts) |
| `/admin/topics/new` | Create a new topic |
| `/admin/topics/[id]/conclude` | Conclude a topic with verdict + summary |
| `/admin/comments` | Moderate flagged comments |

## Getting Started

```bash
# The colon in the directory path breaks npx, so use the full binary path

# Dev server
/root/Builds/Myth:GateWay/node_modules/.bin/next dev -p 3333

# Production build
/root/Builds/Myth:GateWay/node_modules/.bin/next build
```

Or from the project root:

```bash
./node_modules/.bin/next dev -p 3333
```

## Seed Data

The database comes pre-seeded with 9 categories, 8 topics, and sample comments covering conspiracies from Moon landing hoax to simulation hypothesis to Paul is Dead.

## Project Status

| Phase | Status |
|-------|--------|
| Foundation (Next.js + Prisma + SQLite) | ✅ Complete |
| Core Pages (home, topic detail, navigation) | ✅ Complete |
| Comment System (anonymous, rate-limited) | ✅ Complete |
| Admin Panel (CRUD, verdict, moderation) | ✅ Complete |
| Timer & Countdown | ✅ Complete |
| Voting & Upcoming Pipeline | ✅ Complete |
| WhatsApp Announcements | ⬜ Planned |
| AI/ML Auto-Conclude | ⬜ Planned |
| Deployment & Infrastructure | ⬜ Planned |
