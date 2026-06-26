# Myth:GateWay — Build Plan

## Concept
A platform where conspiracies and myths from any field are posted as timed "case files." The public comments with an anonymous ID (no login required). When the timer expires, an admin concludes the case with a verdict: **BUSTED**, **TRUE**, or **INCONCLUSIVE** — backed by a crowd-sourced summary.

## Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Prisma + SQLite |
| Animations | Framer Motion |
| Icons | Lucide React |
| Forms/Actions | Next.js Server Actions |
| Notifications | react-hot-toast |

## Database Schema (Prisma + SQLite)
- **Category** — id, name, slug, description, icon, color
- **Topic** — id, title, slug, description, evidence, categoryId, imageUrl, status (ACTIVE | CONCLUDED | UPCOMING), durationDays, endsAt, verdict (BUSTED | TRUE | INCONCLUSIVE | null), summary, createdBy
- **Comment** — id, topicId, anonymousId, displayName, content, isFlagged, createdAt
- **Vote** — id, topicId, anonymousId, createdAt (for upcoming topic voting)
- **AnonymousUser** — id (UUID), color, createdAt, lastCommentedAt

## Pages & Routes
| Route | Purpose |
|-------|---------|
| `/` | Landing + card grid + category filter + upcoming topics |
| `/topic/[slug]` | Topic detail + live countdown + comment section + verdict |
| `/admin` | Dashboard (stats, active/concluded/upcoming counts) |
| `/admin/topics/new` | Create new topic (ACTIVE or UPCOMING) |
| `/admin/topics/[id]/conclude` | Conclude topic with verdict + summary |
| `/admin/comments` | Moderate flagged comments |
| `/api/comments` | POST comments (API fallback) |
| `/api/vote` | POST toggle vote on upcoming topics |
| `/api/user-votes` | GET user's votes by anonymousId |
| `/api/admin/promote` | POST promote upcoming → active |

## Build Phases

### ✅ Phase 1: Foundation
Next.js project scaffolded, Prisma schema, SQLite DB, seed data (9 categories, 8 topics, 41 comments)

### ✅ Phase 2: Core Pages
Home page (hero, card grid, category filter, search), topic detail page, navigation

### ✅ Phase 3: Comment System
Anonymous ID (localStorage UUID + deterministic color), comment form, comment list, rate limiting

### ✅ Phase 4: Admin Panel
Dashboard, create topic, conclude with verdict, comment moderation (flag/delete)

### ✅ Phase 5: Timer & Auto-Conclusion
Live countdown per topic, 1-30 day duration, timer display on cards + detail page

### ✅ Phase 6: Polish
Animations (Framer Motion), responsive layout, error states, skeleton loaders, edge cases

### ✅ Phase 6b: Voting & Upcoming Pipeline
UPCOMING status, vote-to-launch, admin promote flow, 4 seeded upcoming topics

### ⬜ Phase 7: WhatsApp Conclusion Announcements
**Status:** Planned — not started

**Goal:** When a topic is concluded (admin delivers verdict), automatically push the announcement to a WhatsApp group.

**Approach:** Baileys (Node.js — `@whiskeysockets/baileys`) — WhatsApp MD protocol, no browser needed.

**Pipeline:**
1. Cron job (every 1-2 min) checks Myth:GateWay SQLite DB for newly concluded topics
2. Queries topics where `status = 'CONCLUDED'` and `announced = false` (add boolean field)
3. Formats message: topic title, verdict (BUSTED/TRUE/INCONCLUSIVE), summary excerpt, link
4. Sends to configured WhatsApp group via Baileys session
5. Marks `announced = true` to prevent duplicates

**Requirements:**
- [ ] Install `@whiskeysockets/baileys` + `qrcode-terminal`
- [ ] Add `announced` boolean field to Topic model in Prisma schema
- [ ] Run `prisma db push` to update SQLite
- [ ] Write watch script: `scripts/whatsapp-announcer.ts`
- [ ] QR scan once to authenticate Baileys session
- [ ] Register as Hermes cron job (every 1m or 2m)
- [ ] Handle session persistence (multi-file auth state)
- [ ] Test with a concludable topic

**Alternative:** Telegram gateway — simpler since Hermes bot is already connected. Send conclusion announcements via Hermes cron delivery instead.

### ⬜ Phase 8: AI/ML Auto-Conclude System
**Status:** Planned — not started

**Goal:** Automatically analyze user comments and submitted evidence sources to generate a proposed verdict (BUSTED / TRUE / INCONCLUSIVE) and a written summary — reducing admin burden and adding data-driven objectivity.

**Approach:** Local LLM inference via Ollama + Hermes cron. No API keys, no external services, runs entirely on Dibba.

**Pipeline:**
1. When a topic's timer expires (or admin triggers auto-conclude), an automated process runs
2. Collects all comments and evidence text for the topic from the SQLite DB
3. Feeds the content to a local LLM with a structured prompt:
   - Analyze each argument and counter-argument
   - Weight evidence quality and source reliability
   - Determine majority sentiment vs outlier views
   - Assign a confidence score
4. LLM returns: proposed verdict (BUSTED / TRUE / INCONCLUSIVE), draft summary (2-4 sentences), key arguments extracted, confidence level
5. Admin dashboard shows the AI proposal as a suggestion — admin can accept, edit, or override
6. If admin accepts with no edits → auto-conclude. If they edit → manual conclude as normal.

**Verification & Bias Safeguards:**
- Prompt engineering: instruct LLM to be neutral, cite specific comments as evidence
- Confidence threshold: below 60% → force admin review (no auto-accept)
- Source weighting: evidence field (admin-written) weighted higher than any single comment
- Category-aware: different reasoning templates per category (Science vs Paranormal vs Politics)
- Audit log: store LLM raw output, prompt used, and final decision per topic

**Architecture Options:**

| Option | Pros | Cons |
|--------|------|------|
| **Ollama (local)** | Free, private, no API key | Needs GPU or beefy CPU ~7B+ model |
| **Hermes LLM** (this session) | Already running, zero setup | Tied to this conversation, not async cron-friendly |
| **OpenRouter API** | Cloud, fast, capable models | Requires API key + cost per conclusion |
| **vLLM + Qwen/DeepSeek** | Self-hosted, fast inference | More setup, needs GPU |

**Requirements:**
- [ ] Choose & set up LLM backend (recommend: Ollama + Qwen2.5-7B or DeepSeek-Coder-7B)
- [ ] If local: `ollama pull qwen2.5:7b` or similar
- [ ] Write analysis module: `scripts/auto-conclude.ts`
- [ ] Design structured prompt per category (Science rules differ from Paranormal)
- [ ] Add `aiSuggestion` JSON field to Topic model in Prisma schema
- [ ] Add `aiConfidence` float field
- [ ] Run `prisma db push`
- [ ] Auto-trigger on timer expiry (Phase 5 integration)
- [ ] Admin UI: show AI proposal card on conclude page with Accept/Edit/Override buttons
- [ ] Audit logging: store prompt, raw response, final action per topic
- [ ] Register as Hermes cron job or as a Next.js API route (triggered by expiry check)

**Future Enhancements:**
- Sentiment curve over time (were early comments different from late ones?)
- Source credibility scoring (cross-reference cited sources against known databases)
- Multi-model ensemble (run 3 models, majority vote)
- Comment clustering (group similar arguments automatically)

### ⬜ Phase 9: Deployment & Infrastructure
- GitHub repo setup
- Image upload system (currently placeholders)
- Auto-conclude expired topics (cron fallback)
- Hosting

---

## File Structure
```
/root/Builds/Myth:GateWay/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── HomeContent.tsx
│   │   ├── topic/[slug]/
│   │   │   ├── page.tsx
│   │   │   └── TopicDetailClient.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── topics/new/
│   │   │   │   ├── page.tsx
│   │   │   │   └── CreateTopicForm.tsx
│   │   │   ├── topics/[id]/conclude/
│   │   │   │   ├── page.tsx
│   │   │   │   └── ConcludeTopicForm.tsx
│   │   │   └── comments/
│   │   │       ├── page.tsx
│   │   │       └── CommentsPanel.tsx
│   │   └── api/
│   │       ├── comments/route.ts
│   │       ├── vote/route.ts
│   │       ├── user-votes/route.ts
│   │       └── admin/promote/route.ts
│   ├── components/
│   │   ├── layout/ (Navbar, Footer)
│   │   ├── home/ (HeroSection, CategoryFilter, TopicCard, TopicGrid)
│   │   ├── topic/ (CountdownTimer, VerdictBanner, CommentForm, CommentItem, CommentSection)
│   │   ├── admin/ (StatsCard)
│   │   └── ui/ (Badge, Button, Card, Input, Select, Textarea)
│   └── lib/ (prisma.ts, actions.ts, utils.ts, anonymous.ts)
├── scripts/
│   └── whatsapp-announcer.ts  ← Phase 7
└── plan.md
```
