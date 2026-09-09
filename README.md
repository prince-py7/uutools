# UU Community

College-friendly Instagram-style social hub for **United University** students — campus feed, Study Mode, profiles, search, and tools (Image Finder, Attendance, Timetable, Favourites). Built to run **100% free** on Vercel + Supabase Hobby.

> Stories, friends, and DMs are Phase 2 (not in this MVP).

## Quick start (demo mode — no keys needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo accounts:

| Username | Password | Role |
| --- | --- | --- |
| `aarav` | `password` | Student (BCA B) |
| `riya_cr` | `password` | CR (BCA B) |
| `prof_sharma` | `password` | Professor |
| `admin` | `admin123` | Developer portal |

Demo data lives in browser `localStorage` until you connect Supabase.

## Free production stack

| Layer | Service | Plan |
| --- | --- | --- |
| App hosting | [Vercel](https://vercel.com) | Hobby (free) |
| Auth + DB + Storage | [Supabase](https://supabase.com) | Free |
| Google login | Google Cloud OAuth | Free |

## Connect Supabase (when ready)

1. Create a free Supabase project.
2. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. Create Storage buckets: `avatars`, `post-media`, `study-files` (public read).
4. Auth → Providers → enable **Email** and **Google**.
5. For Google: create OAuth client in Google Cloud Console; set redirect URI to  
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
6. Copy `.env.example` → `.env.local` and fill:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_IMAGE_API_URL=https://api.uuonline.in/api/student/image
```

7. After first signup of your account, promote yourself to admin:

```sql
update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
```

8. Deploy on Vercel: Import this repo → add the same env vars → Deploy.

## Features (MVP)

- Instagram-like login (username/password; Google when Supabase configured)
- College select (United University seeded; multi-college ready)
- Home feed: classmates first, likes / comments / share
- **Study Only** + **Class Only** toggles
- Study filters: Verified only (default on), class / section / subject, assignments, practicals
- Badges: Developer, `BCA B - CR`, `BCA B - Professor`, Verified, green **UNITIANS POPULAR**
- Developer portal: classes/sections/subjects, CR/Professor assign, popular like threshold, disable users
- Profiles (bio, socials, avatar URL), search + class directory filter
- Tools sidebar: Image Finder, Attendance calculator, Mon–Fri 7-slot timetable, Favourites

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## Legacy UU Tools

The original static UUID finder lives in [`legacy-uutools/`](legacy-uutools/) and is ported into `/tools/image-finder`.
