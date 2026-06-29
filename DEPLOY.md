# Deploy Noir:GateWay

## Option A — Vercel (recommended)

The simplest way to go live. Connect your GitHub repo to Vercel:

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `LEADRACER/Myth-GateWay` repo
3. Set the following Environment Variables in Vercel dashboard:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Direct Supabase PG connection |
| `DIRECT_URL` | Pooled Supabase PG connection |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[PROJECT_REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (optional, for admin ops) |
| `NEXT_PUBLIC_SITE_URL` | `https://myth-gateway.vercel.app` |

4. Deploy → Vercel auto-detects Next.js and uses `vercel.json` config
5. After deploy, go to **Settings → General → Build & Development Settings** and ensure:
   - Build Command: `npm run build`
   - Output Directory: `.next`

The `DIRECT_URL` (pooled connection) is critical for Vercel's serverless functions.

## Option B — Self-hosted (systemd)

Runs the production server as a systemd service on a Linux machine.

```bash
# 1. Build
cd /root/Builds/Noir:GateWay
npm run build

# 2. Install service
cp noir-gateway.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable noir-gateway
systemctl start noir-gateway

# 3. Check status
systemctl status noir-gateway

# 4. Server runs on port 3000
curl http://localhost:3000
```

## Option C — Docker

```bash
# Build image
docker build -t noir-gateway .

# Run
docker run -d \
  --name noir-gateway \
  -p 3000:3000 \
  --env-file .env.local \
  noir-gateway
```

---

## First-Time Setup (after deploy)

Once the app is live, bootstrap the first admin:

1. Visit the site and claim your DET badge (click the badge icon)
2. Note your badge code (shown in the badge modal — format: `DET-XXXX`)
3. In browser console:
```js
fetch('/api/admin/setup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({badgeCode:'DET-XXXX'})}).then(r=>r.json()).then(console.log)
```
4. Refresh → you're now BRU (Bureau). Full admin panel at `/admin`.
5. From the admin AGENTS tab, you can generate BRU badges for other admins.

---

## Environment Variables

All vars are documented in `.env.example`. Minimum required for production:

```
DATABASE_URL="postgresql://postgres:***@db.[PROJECT_REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
```

Requires a Supabase project with the schema pushed via `npx prisma db push`.
