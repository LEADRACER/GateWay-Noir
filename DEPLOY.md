# Deploy Noir:GateWay to Vercel

## 1. Connect repo

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `LEADRACER/Myth-GateWay` repo
3. Vercel auto-detects Next.js — settings are already in `vercel.json`

## 2. Set environment variables

In Vercel dashboard → **Settings → Environment Variables**:

| Variable | Source | Note |
|---------|--------|------|
| `DATABASE_URL` | Supabase → Settings → Database → pick **Pooled** | Runtime queries — must use pooled on Vercel! |
| `DIRECT_URL` | Supabase → Settings → Database → pick **Direct** | For Prisma Migrate, `prisma db push` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | Needed for evidence upload/delete |
| `SUPABASE_STORAGE_BUCKET` | `"evidence"` (default) | Only change if you renamed the bucket |
| `UPLOAD_PASSWORD` | Optional | Passphrase to gate evidence uploads |

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
