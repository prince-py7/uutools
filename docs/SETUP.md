# Setup checklist for free hosting

## 1. Local demo
- [x] `npm install && npm run dev`
- [ ] Log in as `aarav` / `password`
- [ ] Toggle Study Only + filters
- [ ] Open Developer portal as `admin` / `admin123`

## 2. Supabase (free)
- [ ] Create project at https://supabase.com
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Enable Email + Google auth providers
- [ ] Create buckets: avatars, post-media, study-files
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Google OAuth (free)
- [ ] Google Cloud Console → Credentials → OAuth client
- [ ] Authorized redirect: `https://<ref>.supabase.co/auth/v1/callback`
- [ ] Paste Client ID/Secret into Supabase Google provider

## 4. Vercel (free)
- [ ] Import GitHub repo on https://vercel.com
- [ ] Add env vars from `.env.example`
- [ ] Deploy → open `*.vercel.app`
- [ ] Promote your user: `update profiles set is_admin = true where username = '...';`

## Notes
- Without Supabase env vars the app runs in **Demo mode** (localStorage).
- Stay on free tiers: compress images, PDF ≤ 10MB, paginate feeds.
