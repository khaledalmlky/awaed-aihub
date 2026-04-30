# Agents

## Cursor Cloud specific instructions

### Project Overview
Awaed AIHub is a full-stack Node.js/TypeScript marketing intelligence platform (Express + React SPA in one process). See `README.md` for architecture and available tools.

### Required Services
- **PostgreSQL** (port 5432): Start with `pg_ctlcluster 16 main start`. Create DB user and database if not present.
- **Node.js dev server** (port 5000): Runs Express backend + Vite frontend with HMR.

### Environment Variables
The app does **not** use `dotenv`. You must export variables before running `npm run dev`. Copy `.env.example` to `.env` and source it:
```bash
export $(grep -v "^#" .env | xargs)
npm run dev
```

Required env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. See `.env.example` for the full list.

### Key Commands
| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `export $(grep -v "^#" .env | xargs) && npm run dev` |
| Type check | `npm run check` |
| DB schema push | `npm run db:push` |
| Build (prod) | `npm run build` |

### Gotchas
- **No dotenv**: The `tsx` runner and `cross-env` do not auto-load `.env` files. You must manually export env vars before running any npm script that accesses the database or OpenAI.
- **TypeScript errors in `server/replit_integrations/`**: These are legacy dead-code files not imported by the main app. They produce TS errors but do not affect runtime.
- **`client/src/pages/forgot-password.tsx`**: Referenced in `App.tsx` but was missing from the repo. A placeholder was added to prevent Vite crashes when loading the frontend.
- **Admin auto-bootstrap**: On first server start, an admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars. Subsequent starts skip this if an admin already exists.
- **OPENAI_API_KEY**: The AI tool features require a valid OpenAI API key. The server starts fine with a placeholder, but AI analysis requests will fail without a real key.
