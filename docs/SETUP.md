# UNITIANS setup (Supabase Free + Vercel Hobby)

Non-commercial campus pilot. Free tiers pause inactive projects and cap storage/bandwidth — monitor the Supabase and Vercel dashboards.

## 1. Create projects

1. Create a **Supabase** free project.
2. Create a **Vercel** Hobby project linked to this repo.
3. Do **not** enable Google or any OAuth provider.

## 2. Database migration

In Supabase → SQL Editor, run in order:

1. `supabase/schema.sql` — tables, RLS, triggers, United University + BCA/BTech seed, `app_settings`
2. `supabase/storage.sql` — buckets `avatars`, `post-media`, `study-files`, `stories` + policies
3. If onboarding has empty class/section dropdowns, also run `supabase/seed_uu.sql`
4. If your own profile posts are missing after an older schema, run `supabase/patch_posts_read.sql` (own posts are always readable; peers stay college-scoped)
5. For College ID / enrollment number on profiles, run `supabase/patch_enrollment_id.sql`
6. For class announcements + notifications + Web Push, run `supabase/patch_notifications.sql` **(required — without it Notifications shows “table missing”)** (also included in fresh `schema.sql`)
7. For custom roles (beyond CR/Professor) + role catalog + teacher permissions UI, run `supabase/patch_roles_permissions.sql`
8. For class → semester → subjects + study-material post fields (`semester_id`, `study_unit`, `academic_year`, `media_name`) + friend-request notification types, run `supabase/patch_semesters_study.sql`

If you previously applied an older schema, re-run the full scripts (policies are dropped/recreated) or apply deltas carefully for Phase-2 tables: `stories`, `story_views`, `friend_requests`, `conversations`, `messages`, `shares`, `teacher_delegations`, and profile column `last_verification_sent_at`.

**Phase-2 surfaces** (friends, DMs, stories, search, favourites, timetable, admin directory CRUD) ship in full `schema.sql`. No extra patches are required for those features if the full schema is already applied — only use `patch_*.sql` when upgrading an older project.

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

# Optional Web Push (class announcement phone alerts)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourdomain.com
```

### Web Push keys (fix “Push keys are not configured”)

Without VAPID keys the app still enables **browser notification permission** and in-app alerts. For real push to phones:

```bash
npx web-push generate-vapid-keys
```

Put the **public** key in Vercel / `.env.local` as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and the **private** key as `VAPID_PRIVATE_KEY` (server-only). Redeploy after saving.

### Forgot-password OTP (not a Vercel URL)

Supabase default emails include a magic link that points at your Site URL (often Vercel). The app now requests an **email OTP**.

In Supabase → Authentication → Email Templates (Magic Link / Reset):

- Include `{{ .Token }}` (the 6-digit code) in the body
- You can keep or remove `{{ .ConfirmationURL }}`

Also set Authentication → Providers → Email → enable OTP / email codes.

### Storage RLS upload errors

If posts/chat show `new row violates row-level security policy`, re-run in SQL Editor:

1. `supabase/storage.sql` (buckets + policies; allows chat audio MIME on `post-media`)
2. `supabase/patch_messages_media.sql` (message media columns, **messages UPDATE** for read receipts, realtime)

Uploads must be signed in; files go under `{auth.uid()}/...`.

Without these, the app runs in **demo mode** (localStorage). With them set, the full app is live against Supabase: auth, feed, friends, DMs, stories, search, favourites, timetable, and admin — demo/localStorage is only the offline fallback when env is missing.

## 5. Bootstrap developer admin

After your first signup:

```sql
update public.profiles
set is_admin = true, onboarding_complete = true
where username = 'your_username';
```

That sets the **Admin** label on your profile and posts (and unlocks `/admin`). Assign CR / Professor / custom roles from the Admin panel — those labels appear next to the name on profile and posts.

Then use `/admin` to add colleges/classes/sections/subjects, create custom roles, assign CR/Professor/custom roles, grant teacher permissions (manage subjects / official posts), set the popularity threshold and free-tier notice (`app_settings`: `popular_like_threshold`, `free_tier_notice`), and disable users.

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
4. Smoke-test: signup → onboarding (college required) → feed → friends/DM → story → search → favourites → timetable → admin

## 9. Tests

```bash
npm test
npm run build && npm run test:e2e
```

See `e2e/README.md` if browsers are unavailable in CI — unit tests still cover core rules.
