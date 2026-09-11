# UNITIANS setup (Supabase Free + Vercel Hobby)

Non-commercial campus pilot. Free tiers pause inactive projects and cap storage/bandwidth — monitor the Supabase and Vercel dashboards.

## 1. Create projects

1. Create a **Supabase** free project.
2. Create a **Vercel** Hobby project linked to this repo.
3. Do **not** enable Google or any OAuth provider.

## 2. Database migration

In Supabase → SQL Editor, run in order:

1. `supabase/schema.sql` — tables, RLS, triggers, United University + BCA/BTech seed, settings  
2. `supabase/storage.sql` — buckets `avatars`, `post-media`, `study-files`, `stories` + policies  
3. If onboarding has empty class/section dropdowns, also run `supabase/seed_uu.sql`  

If you previously applied an older schema, re-run the full scripts (policies are dropped/recreated) or apply deltas carefully for Phase-2 tables: `stories`, `story_views`, `friend_requests`, `conversations`, `messages`, `shares`, `teacher_delegations`, `last_verification_sent_at`.

## 3. Auth (email only)

Supabase → Authentication → Providers:

- **Enable Email**
- Leave Google / Apple / etc. **disabled**
- Optional: “Confirm email” — the app does **not** gate access on verification. Users get full access immediately. Account Settings shows a reminder and a throttled “Send verification email” action (`auth.resend`).

Site URL / redirect allow list:

- `http://localhost:3000`
- `https://<your-vercel-domain>`
- Callback path: `/auth/callback`

## 4. Environment variables

Copy `.env.example` → `.env.local` (and Vercel Project Settings):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_IMAGE_API_URL=https://api.uuonline.in/api/student/image
```

Without these, the app runs in **demo mode** (localStorage).

## 5. Bootstrap developer admin

After your first signup:

```sql
update public.profiles
set is_admin = true, onboarding_complete = true
where username = 'your_username';
```

Then use `/admin` to add colleges/classes/sections/subjects, assign CR/Professor, set the popularity threshold, and disable users. Teacher delegation is modeled in SQL (`teacher_delegations`) but **not granted** in the UI yet.

## 6. Upload limits

Client enforcement in `src/lib/uploads.ts`:

| Kind | MIME | Max |
|------|------|-----|
| Avatar | jpeg/png/webp/gif | 2 MB |
| Post image | jpeg/png/webp/gif | 10 MB |
| Study file | images + PDF | 10 MB |
| Story | images + mp4/webm | 25 MB |

## 7. Deploy

```bash
npm run build
# or push to main / PR and let Vercel build
```

Point the Vercel project at this repo. Prefer Hobby for the pilot.

## 8. Migration trigger (when you change schema)

1. Edit `supabase/schema.sql` / `storage.sql`
2. Run in SQL Editor on the project
3. Redeploy the Next app if types/client paths changed
4. Smoke-test: signup → onboarding (college required) → feed → admin

## 9. Tests

```bash
npm test
npm run build && npm run test:e2e
```

See `e2e/README.md` if browsers are unavailable in CI — unit tests still cover core rules.
