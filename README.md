# UU-TOOLS

UU-TOOLS is a professional Next.js web app for requesting an image from an API using an exact 11-digit UUID.

## Features

- Separate fields for:
  - Image API endpoint
  - API key
  - API secret
  - Bearer/access token
- Dedicated 11-digit UUID input
- `ENTER` button with validation
- Server-side API bridge at `/api/fetch-image`
- Image preview with loading and error states
- Footer: `MADE WITH ❤️ BY PRINCE`

## How the API request works

The app sends the form data to `/api/fetch-image`. The server route:

1. Validates the UUID as exactly 11 digits.
2. Appends the UUID to the endpoint as a `uuid` query parameter.
3. Forwards credentials as headers:
   - `X-API-Key`
   - `X-API-Secret`
   - `Authorization: Bearer <token>`
4. Accepts either:
   - A direct image response (`image/png`, `image/jpeg`, etc.)
   - JSON containing an image field such as `imageUrl`, `image_url`, `url`, `image`, or `imageSrc`

Credentials are used only for the request and are not stored.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js in your browser.

## Build

```bash
npm run build
```
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
