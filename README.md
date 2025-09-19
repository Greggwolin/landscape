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

## Database Schema Cheat Sheet

- Generate live schema markdown: `DATABASE_URL=postgres://... npm run schema:md`
- Output: `docs/db-schema.md`
- The schema is introspected from the `landscape` schema using the Neon serverless client.

Note: Prisma is not used by this project. We connect to Neon directly in server-side API routes via `@neondatabase/serverless` (see `src/lib/db.ts`).

### Universal Container System

- SQL migrations live under `db/migrations/` with paired `*.up.sql` and `*.down.sql` files.
- Seed helpers and sample data for testing are in `docs/sql/universal_container_system.sql`.
- Architectural notes, API endpoints, and data contracts are documented in `docs/universal-container-system.md`.

## Market Assumptions Persistence

- Create table (run in Neon): `docs/sql/market_assumptions.sql`
- API:
  - `GET /api/assumptions?project_id=7`
  - `POST /api/assumptions` with `{ project_id, commission_basis, demand_unit, uom }`
