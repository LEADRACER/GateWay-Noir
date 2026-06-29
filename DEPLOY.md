# Deploy Noir:GateWay to Vercel

## 1. Connect repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `LEADRACER/Myth-GateWay` repo
3. Vercel auto-detects Next.js — settings are already in `vercel.json`

## 2. Set environment variables

In Vercel dashboard → **Settings → Environment Variables**:

| Variable | Source |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (direct) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Connection string (pooled) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `NEXT_PUBLIC_SITE_URL` | `https://myth-gateway.vercel.app` (or your custom domain) |

The `DIRECT_URL` pooled connection is critical for Vercel serverless functions.

## 3. Deploy

Click Deploy. That's it.

## 4. First-time admin setup

Once the site is live:

1. Visit the site, claim your DET badge (click the badge icon)
2. Note your badge code from the modal (format: `DET-XXXX`)
3. Open browser console and run:
```js
fetch('/api/admin/setup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({badgeCode:'DET-XXXX'})}).then(r=>r.json()).then(console.log)
```
4. Refresh → you're BRU. Full admin at `/admin`.
5. Use the **Create New Admin** section in the AGENTS tab to generate BRU badges for other admins.

---

**Env vars reference:** `.env.example` in the repo root.
