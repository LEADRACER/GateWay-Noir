# Supabase Setup for Noir:GateWay

The project currently runs on **SQLite** (`prisma/dev.db`). To deploy or go production, migrate to **Supabase PostgreSQL**.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
   - Name: `Noir:GateWay` (or whatever you want)
   - Database Password: generate a strong one, save it
   - Region: closest to your users
3. Wait ~2 minutes for provisioning

## 2. Get Connection Strings

In your Supabase project dashboard → **Project Settings** → **Database** → **Connection string**:

```
# Direct connection (for Prisma migrations)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Pooled connection (for Prisma queries — recommended for serverless)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].pooler.supabase.com:5432/postgres
```

Also copy the pooler connection string — it's better for Vercel/edge functions.

## 3. Create .env.local

Create `/root/Builds/Noir:GateWay/.env.local`:

```env
# Database (Direct — for migrations)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Database (Pooled — for queries in serverless)
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].pooler.supabase.com:5432/postgres"

# Supabase Auth (only if using Supabase Auth instead of badge-based auth)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon_public_key]"

# Supabase Service Role (for admin operations — keep secret!)
SUPABASE_SERVICE_ROLE_KEY="[service_role_key]"
```

Get the anon key from **Project Settings** → **API** → **Project API keys** → `anon public`.

## 4. Update Prisma Schema

Change `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

The `@default(cuid())` and other annotations work identically on PostgreSQL.

## 5. Push the Schema

```bash
cd /root/Builds/Noir:GateWay

# Push schema to Supabase
npx prisma db push

# Or create a migration file
npx prisma migrate dev --name init
```

If `db push` fails, check:
- Connection string has no typos
- IP isn't blocked (Supabase allows all by default)
- Password is URL-encoded (special chars like `@$%` need `%40%24%25`)

## 6. Seed Data

Populate categories and an initial BRU user:

```bash
npx prisma db seed
```

The seed file at `prisma/seed.ts` creates categories like HOMICIDE, RESEARCH, CONSPIRACY and an initial admin user. Make sure `seed.ts` works with PostgreSQL (it uses `prisma.$transaction` which is fine).

## 7. Verify

```bash
npx prisma studio
```

Opens Prisma Studio at http://localhost:5555 — verify all tables exist and data is there.

## 8. Enable Row-Level Security (Optional)

If you move user auth to Supabase Auth instead of the badge-code system:

1. In Supabase Dashboard → **Authentication** → **Providers** → Enable Email or Google
2. Add `@supabase/supabase-js` and `@supabase/ssr` packages
3. Add middleware for session handling
4. Replace the badge-based auth in `src/components/badge/BadgeProvider.tsx` with Supabase auth

**Important:** The badge code system currently discovers users by `linkedIds` (anonymous cookies). If you switch to Supabase Auth, you'll need to bridge: store the Supabase user ID in the User model or use it as the primary lookup.

## 9. Supabase Storage (Evidence Photos)

Evidence uploads now default to **Supabase Storage** if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. Falls back to local filesystem (`public/uploads/evidence/`) if Supabase isn't configured.

**To set up:**

1. In Supabase Dashboard → **Storage** → **Create bucket** → name it `evidence` (public)
2. Or let the app auto-create it on first upload (uses anon key, which has `createdb` permission on default project settings)

Files are stored as WebP at 800px max width, 80% quality.

**Module:** `src/lib/supabase-storage.ts` — exports `uploadEvidence(buffer)`.

## 10. Supabase Admin Client

For bureau-level admin operations (user management, custom queries), a service-role client is available at `src/lib/supabase-admin.ts`.

**To use:**

1. Get the service_role key from **Supabase Dashboard** → **Project Settings** → **API** → `service_role` key
2. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIs..."
   ```
3. Import:
   ```ts
   import { getAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
   ```

**Warning:** The service_role key bypasses Row-Level Security. Only use in server-only code (API routes, server actions).

## 11. Connection Pooling Note

Supabase's pooler has a 15-minute idle timeout for free tier. The first query after idle may take 2-3 seconds (cold start). Prisma handles reconnection automatically. For a hobby project this is fine.

## 10. Rollback Plan

To go back to SQLite:
```bash
git checkout prisma/schema.prisma
rm .env.local
npx prisma db push --force-reset
```

---

**TL;DR:** Create Supabase project → copy two connection strings → change `provider = "postgresql"` in schema → `npx prisma db push` → done.
