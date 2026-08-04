# Noir:GateWay — Fix Verification Report (post-deploy re-debug)

Date: 2026-07-31
Target: https://gate-way-noir.vercel.app (prod, deployed 2026-07-31 with full fix pass)
Baseline: docs/DEBUG-2026-07-31.md (11 findings + 3 workflow bugs)
Method: same AGT/DET/BRU/ANON battery, read-only + one self-contained claim probe (test badge created, verified, deleted)

## Fix verification — all previously-reported issues

| # | Finding (original) | Status | Live proof |
|---|---|---|---|
| 1 | RLS OFF — anon key = full DB dump | ⬜ OPEN — migration written, needs user SQL apply | anon `select` on User still 200; supabase/migrations/20260731_enable_rls.sql ready |
| 2 | Session cookie = raw badgeCode (forgeable) | ✅ FIXED | `noirgateway_session=BRU-DTWZ` → 403 on agent routes; cookie now HMAC-signed + 7d expiry |
| 3 | Claim = takeover of any unclaimed badge | ✅ FIXED | claim from other device → 403 "not linked"; own device → 200 + signed cookie |
| 4 | Unauth cron (CRON_SECRET unset) | ⏸ EXCLUDED (automation — user domain) | — |
| 5 | name/phone no auth + code oracle | ✅ FIXED | name/phone without session → 403; with forged cookie → uniform 403; owner rename works (200) |
| 6 | Elevation/request no auth + client userId | ✅ FIXED | anonymous → "Unauthorized — log in with your badge first" |
| 7 | createAgentUser/createBureauUser no auth | ✅ FIXED | BUREAU-only, temp 8-digit passcode, returns passcode once |
| 8 | getAllUsers/getUsersByRole/updateTaskStatus no auth | ✅ FIXED | all BUREAU-only / owner-scoped |
| 9 | Badge generate never hands out cookie | ✅ CONFIRMED (by design) | generate returns code only; claim/verify issue the session |
| 10 | ~~UNSOLVED unstyled~~ | ✅ FALSE POSITIVE retired | VerdictBanner amber fallback exists |
| 11 | admin/check trusts spoofable cookie | ✅ FIXED | forged cookie → admin:false, cookieAdmin:false |

Plus: discussions/messages insert errors now checked (no fake 201s); createdBy from session; rate limits live on claim/login/name/phone (429 after 5 rapid login attempts verified); elevation approve/reject session-checked (body adminId alone → "Unauthorized", no mutation).

## New findings from re-debug

1. MED — login existence oracle: verify-password returned 404 "User not found" vs 400 "No password set" vs 401 "Invalid password" → code enumeration. FIXED + redeployed: all failure branches now uniform 401 "Invalid badge code or passcode" (verified live on 3 cases). Rate limits already capped this (5/code/min, 30/IP/min).
2. INFO — /api/comments without topicId → 400, /api/vote without formData → 500: both are test-artifact errors, not app bugs (routes require params; no regression).
3. INFO — elevation/approve "Admin ID required" 401 precedes session check; with body adminId but no session → "Unauthorized", no DB mutation. Safe.

## Cleanup executed

- rls-probe-1 comment row deleted (HTTP 204) — the last debug artifact is gone
- Fix-verify test badge DET-5JUJ created + claimed + renamed + deleted (service role)

## Still open (user action required)

- Apply supabase/migrations/20260731_enable_rls.sql (SQL editor or `supabase link --project-ref bovsdzvkhtcilsvkayec && supabase db push`) — closes finding #1 permanently
- Automation items untouched: cron scheduling, CRON_SECRET guard, n8n/WAHA consumers (user domain)
