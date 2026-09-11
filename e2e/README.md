# UNITIANS E2E (Playwright)

Demo-mode suite — no Supabase credentials required.

## Run locally

```bash
npm install
npx playwright install chromium
npm run build
npm run test:e2e
```

`playwright.config.ts` starts `npm run start` automatically.

## Coverage

| Flow | Spec |
|------|------|
| Registration + onboarding | `registration and login` |
| Login + Study/Class filters | `login + feed filters` |
| Admin portal / roles / free-tier | `admin roles portal` |
| Friend requests | `friend requests accept` |
| DM inbox | `DMs inbox reachable` |
| Class stories rail | `stories rail on home` |
| Profile search | `profile search directory` |
| Responsive footer nav | `responsive footer navigation` |

Projects: Desktop Chrome + iPhone 13 viewport.

## CI note

If the Cloud Agent / CI environment cannot run headed browsers, unit tests (`npm test`) still cover username uniqueness, eligibility/badges, story expiry, timetable validation, verification throttle, and upload MIME/size. Keep this Playwright suite in-repo and run it before merge when browsers are available.
