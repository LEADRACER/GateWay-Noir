# Noir:GateWay — Build Debugging Fix Checklist

> Generated from parallel debugging investigation across all build functionalities.
> Priority: 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low

---

## 🔴 CRITICAL

### 1. Add `typecheck` script to `package.json`
- [ ] **File:** `package.json`
- [ ] **Issue:** CI workflow (`.github/workflows/ci.yml` line 33) runs `npm run typecheck`, but `package.json` has no `typecheck` script. This breaks the entire CI pipeline — the `build` job depends on `lint-and-typecheck` completing.
- [ ] **Fix:** Add `"typecheck": "./node_modules/.bin/tsc --noEmit"` to the `scripts` section.

### 2. Fix rate limiting — missing `await` on async `checkRateLimit()` calls (4 files)
- [ ] **Files:**
  - `src/app/api/badge/claim/route.ts` — lines 47, 53
  - `src/app/api/badge/verify-password/route.ts` — lines 28, 34
  - `src/app/api/badge/name/route.ts` — line 31
  - `src/app/api/badge/phone/route.ts` — line 24
- [ ] **Issue:** `checkRateLimit()` is `async` (returns `Promise<RateLimitResult>`) but called with `!` (synchronous negation). A Promise is always truthy, so `!Promise` is always `false` — the rate-limit block never executes. All brute-force protection on badge claiming, password verification, name updates, and phone registration is silently disabled.
- [ ] **Fix:** Replace `if (!checkRateLimit(...))` with:
  ```typescript
  const rateLimitResult = await checkRateLimit(...);
  if (!rateLimitResult.allowed) { return ... 429 }
  ```
- [ ] **Subtask:** `src/app/api/badge/claim/route.ts` — fix lines 47, 53
- [ ] **Subtask:** `src/app/api/badge/verify-password/route.ts` — fix lines 28, 34
- [ ] **Subtask:** `src/app/api/badge/name/route.ts` — fix line 31
- [ ] **Subtask:** `src/app/api/badge/phone/route.ts` — fix line 24

---

## 🟠 HIGH

### 3. Create missing `scripts/auto-invite.mjs`
- [ ] **File:** `scripts/whatsapp-announcer.mjs` line 26: `import { processGroupInvites } from "./auto-invite.mjs"`
- [ ] **Issue:** The file `scripts/auto-invite.mjs` does not exist. The WhatsApp announcer cron will crash on startup with `Cannot find module './auto-invite.mjs'`, disabling all WhatsApp notifications (elevation approvals, task assignments, topic conclusions).
- [ ] **Fix:** Either create `scripts/auto-invite.mjs` with `export async function processGroupInvites(sock, supabase)` or remove the import and inline the logic.

### 4. Fix `pair.sh` to reference existing script
- [ ] **File:** `pair.sh` line 20: `node scripts/pair-now.mjs`
- [ ] **Issue:** `scripts/pair-now.mjs` does not exist.
- [ ] **Fix:** Point `pair.sh` to the existing `scripts/whatsapp-auth.mjs` or `scripts/qr-pair.mjs`.

### 5. Resolve AgentTask `notified` column schema conflict
- [ ] **Files in conflict:**
  - `scripts/migration.sql` (line 220-221) — adds `notified BOOLEAN` (single column)
  - `scripts/schema.sql` (line 140) — has `notified BOOLEAN` (single column)
  - `supabase/migrations/20260701_whatsapp_notification_columns.sql` (line 17-19) — adds `notified_assigned BOOLEAN` + `notified_completed BOOLEAN` (two columns, with commented-out DROP of `notified`)
  - `whatsapp-announcer.mjs` (lines 282, 303, 319, 356) — references `notified` (singular)
- [ ] **Issue:** Three conflicting schema definitions. If the two-column migration is applied, the announcer script's `notified` updates will fail at runtime.
- [ ] **Fix:** Choose one approach and update all files to match. Recommended: keep `notified` as a single column (simplest), and update `20260701_...sql` to not add the extra columns.

### 6. Fix `20260916_cleanup_inactive_users.sql` column names
- [ ] **File:** `supabase/migrations/20260916_cleanup_inactive_users.sql`
- [ ] **Issue:** Uses snake_case column names (`last_seen_at`, `badge_code`, `created_at`, `user_id`, `agent_id`, `admin_id`, `task_id`, `display_name`) but the actual schema uses camelCase (`lastSeenAt`, `badgeCode`, `createdAt`, `userId`, `agentId`, `adminId`, `taskId`, `displayName`).
- [ ] **Fix:** Replace all snake_case references with camelCase to match `scripts/schema.sql` and `src/lib/types/database.ts`.
- [ ] **Lines to fix:** ~48-49, ~63-69, ~74-80 (all column references in the function body)

### 7. Add `SESSION_SECRET` to CI environment
- [ ] **File:** `.github/workflows/ci.yml` — both `lint-and-typecheck` and `build` jobs
- [ ] **Issue:** `SESSION_SECRET` is not passed as an environment variable. `src/lib/session-cookie.ts` throws at runtime if it's missing when password verification runs. Also, `.env.prod` is not a valid Next.js env file (`.env.production` would be).
- [ ] **Fix:** Add `SESSION_SECRET: ${{ secrets.SESSION_SECRET }}` to the `env:` blocks in CI, and either rename `.env.prod` → `.env.production` or set the secret in Vercel project settings.

### 8. Fix ESLint errors in `src/` (59 errors)
- [ ] **File:** `eslint.config.mjs` — add `ignores` for `.kilo/`, `scripts/`, and `prisma/`
- [ ] **Fix `any` types:**
  - [ ] `src/app/HomeContent.tsx` — replace `any[]` props types with proper `TopicWithCategory[]`
  - [ ] `src/app/admin/page.tsx` — replace `any[]` in serialization with proper types
  - [ ] `src/app/admin/tasks/TasksClient.tsx` — replace `any` type
  - [ ] `src/app/admin/topics/[id]/conclude/ConcludeTopicForm.tsx` — replace `any` type
  - [ ] `src/lib/elevation-actions.ts` — lines 13, 171 — replace `any` with proper types
  - [ ] `src/lib/profile-actions.ts` — line 24 — replace `any` with `Record<string, unknown>`
  - [ ] `src/lib/whatsapp/client.ts` — lines 168, 192 — replace `any` in catch with `unknown`
- [ ] **Fix `react-hooks/rules-of-hooks` (false positives):**
  - [ ] `src/lib/whatsapp/client.ts` line 57 — `useMultiFileAuthState` is a Baileys function, not React. Rename or add `eslint-disable-next-line react-hooks/rules-of-hooks`
  - [ ] `scripts/whatsapp-auth.mjs` line 16 — same issue (if linted)
  - [ ] `scripts/whatsapp-announcer.mjs` line 127 — same issue (if linted)
- [ ] **Fix `react-hooks/set-state-in-effect`:**
  - [ ] `src/app/admin/ElevationsPanel.tsx` line 60 — move `setActiveTab` out of `useEffect` or use a ref
  - [ ] `src/app/admin/tasks/BureauTasksClient.tsx` line 379 — same pattern

### 9. Exclude `.kilo/worktrees/` from ESLint
- [ ] **File:** `eslint.config.mjs`
- [ ] **Issue:** Running `eslint .` lints the git worktree at `.kilo/worktrees/quilted-widget/`, finding 178+ additional errors.
- [ ] **Fix:** Add `.kilo/**` to the `globalIgnores` array in `eslint.config.mjs`.

---

## 🟡 MEDIUM

### 10. Resolve AgentDiscussion `visibility` `'all'` value inconsistency
- [ ] **Files:**
  - `scripts/schema.sql` (line 152) — CHECK includes `'all'`
  - `scripts/migration.sql` (line 76) — CHECK includes `'all'`
  - `supabase/migrations/20260915_discussion_audiences.sql` (line 40-43) — CHECK drops `'all'`
  - `src/lib/types/database.ts` (line 31) — type includes `"all"`
  - `src/lib/discussion-access.ts` (line 1) — `DiscussionAudience` type excludes `"all"`
- [ ] **Fix:** Remove `'all'` from `schema.sql`, `migration.sql`, and `database.ts` type to match the migration and `discussion-access.ts`. Update all code that checks for `visibility === 'all'`.

### 11. Clean up Prisma remnants
- [ ] **Issue:** `@prisma/client` is installed in `node_modules/` but not in `package.json`. No `prisma/schema.prisma` exists. `prisma/seed.ts` is the only Prisma-related file and it uses Supabase, not Prisma. `src/lib/prisma.ts` is a no-op.
- [ ] **Fix:** Delete `prisma/` directory entirely, remove `prisma.ts` stub, remove any Prisma-related references from `tsconfig.json` include patterns.

### 12. Remove unused dependencies from `package.json`
- [ ] **`sharp`** — not imported anywhere in `src/` or `scripts/`. Planned for Phase 10 (photo evidence upload) but not implemented.
- [ ] **`link-preview-js`** — not imported anywhere in `src/` or `scripts/`. Planned but not used.
- [ ] **Fix:** Remove from `package.json` dependencies and `package-lock.json`.

### 13. Remove or implement `whatsapp-announcer.mjs` inline logic
- [ ] **Issue:** `scripts/whatsapp-announcer.mjs` duplicates logic from `src/lib/whatsapp/client.ts` and `src/lib/whatsapp/notifications.ts` instead of importing from them. The inline client (lines 117-247) duplicates the library code.
- [ ] **Fix:** Refactor `whatsapp-announcer.mjs` to import from `src/lib/whatsapp/`, or document the architectural decision.

### 14. Clean up stale `tsconfig.tsbuildinfo`
- [ ] **File:** `tsconfig.tsbuildinfo` (161KB)
- [ ] **Fix:** Delete the stale cache file. It's gitignored anyway, so CI won't be affected, but local builds could use stale data.

---

## 🟢 LOW

### 15. Remove empty `NEXTAUTH_SECRET` from `.env`
- [ ] **File:** `.env` line 12: `NEXTAUTH_SECRET=`
- [ ] **Issue:** NextAuth.js is not used in this project. Empty value is a leftover.
- [ ] **Fix:** Remove the line or set it to a commented-out placeholder with explanation.

### 16. Remove unused `generateCodeWithSuffix` from `src/lib/badge.ts`
- [ ] **File:** `src/lib/badge.ts` line 28
- [ ] **Issue:** `generateCodeWithSuffix` is defined but never called in this file. The server-side version in `src/lib/server/badge.ts` is used instead.
- [ ] **Fix:** Delete the unused function (or export it if needed elsewhere).

### 17. Consolidate duplicate badge generation logic
- [ ] **Files:** `src/lib/badge.ts` and `src/lib/server/badge.ts`
- [ ] **Issue:** Both files define identical helpers (`BADGE_CHARS`, `BADGE_PREFIXES`, `randomChar`, `generateCode`, `extractSuffix`, `generateCodeWithSuffix`). The client wrapper dynamically imports the server version for the actual DB check.
- [ ] **Fix:** Move shared helpers to a module that both can import, eliminating duplication.

### 18. Address ESLint warnings in source files
- [ ] `src/app/admin/ElevationsPanel.tsx:43` — unused `adminId` parameter
- [ ] `src/app/admin/PromoteSection.tsx:25` — unused `adminId` parameter
- [ ] `src/app/admin/comments/page.tsx:1` — unused `deleteComment` and `toggleFlagComment` imports
- [ ] `src/app/admin/layout.tsx:2` — unused imports: `Fingerprint`, `BarChart2`, `User`, `Settings`
- [ ] `src/app/admin/page.tsx:6` — unused `ElevationsPanel` import
- [ ] `src/app/admin/tasks/BureauTasksClient.tsx:517` — unused `idx` variable
- [ ] `src/app/admin/topics/[id]/conclude/ConcludeTopicForm.tsx:6` — unused: `Scale`, `ShieldAlert`, `ShieldCheck`
- [ ] `src/app/agent/connections/page.tsx:12` — unused `Plus` import
- [ ] `src/lib/badge.ts:28` — unused `generateCodeWithSuffix` function
- [ ] `src/lib/discussion-access.ts:57` — unused `_options` parameter
- [ ] **Fix:** Remove all unused imports and parameters.

### 19. Add `eslint.ignoreDuringBuilds` to `next.config.ts`
- [ ] **File:** `next.config.ts`
- [ ] **Issue:** Next.js 16 with Turbopack does not run ESLint during `next build` by default. However, to be explicit and prevent future issues if the configuration changes:
- [ ] **Fix:** Add `eslint: { ignoreDuringBuilds: true }` or keep it `false` and ensure all ESLint errors are fixed (recommended).

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 2 | 0/2 fixed |
| 🟠 High | 7 | 0/7 fixed |
| 🟡 Medium | 4 | 0/4 fixed |
| 🟢 Low | 5 | 0/5 fixed |
| **Total** | **18** | **0/18 fixed** |

### Verification Commands
```bash
# 1. TypeScript type check (after adding typecheck script)
npm run typecheck

# 2. ESLint (after fixing config and errors)
npm run lint

# 3. Next.js build (after all fixes)
npm run build

# 4. CI simulation (after all fixes)
# Compare: npm run lint && npm run typecheck && npm run build
```
