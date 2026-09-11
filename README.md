# UNITIANS

Campus social for United University (multi-college ready). Quiet Instagram-like dark UI.

**Stack:** Next.js 15 · TypeScript · Tailwind · Supabase Free · Vercel Hobby  
**Auth:** Email + password + globally unique username only (no Google/OAuth)  
**Pilot:** Non-commercial. Free quotas can pause projects and limit storage/bandwidth.

## Quick start (demo mode)

```bash
npm install
npm run dev
```

Open http://localhost:3000 — works without Supabase (localStorage demo).

| User | Password | Notes |
|------|----------|-------|
| `aarav` | `password` | Student (unverified email — full access) |
| `riya_cr` | `password` | Class representative |
| `admin` | `admin123` | Developer portal |

## Features

- College-scoped feed (classmate-first), Study Only / Class Only, verified-only default
- Official CR/Professor verification + green **UNITIANS POPULAR** for peer study posts over threshold
- Friend requests, 1:1 DMs, class stories (24h `expires_at`)
- Profiles, username + class/section directory search
- Tools: Image Finder, Attendance, Timetable (Mon–Fri × 7), Favourites
- Developer portal: colleges, classes, sections, subjects, scoped roles, disable users, threshold, free-tier notice

## Production setup

See **[docs/SETUP.md](docs/SETUP.md)** for:

1. Supabase schema + storage buckets  
2. Email provider settings (verification non-blocking)  
3. Env vars + Vercel deploy  
4. Bootstrap first admin  

Legacy static UUID tools live in `legacy-uutools/`.

## Tests

```bash
npm test                 # unit (vitest)
npm run build && npm run test:e2e   # Playwright — see e2e/README.md
```

## License

Private pilot for United University campus use.
