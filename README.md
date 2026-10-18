# YKB — You Know Ball

YKB is a Nigerian football player-stat prediction-market application. This repository is being built phase by phase. Current milestone: Phase 1 — Foundation.

## Phase 1 scope
- pnpm monorepo: NestJS API, Next.js web app, shared TypeScript package
- PostgreSQL + Prisma schema and initial migration
- Phone OTP authentication with expiry, attempt limits, and replay prevention
- Rotating refresh tokens with session-family revocation on reuse
- Double-entry ledger using integer kobo
- ₦1,000,000 virtual signup bonus, granted once per phone/account
- Bonus and cash wallets kept separate
- CI, lint, type-check, and test scripts

## Testing policy
No user stake/bet limits are imposed during the testing phase. This phase does not implement trading or real-money deposits/withdrawals.

## Local development
Requirements: Node.js 22+, pnpm 10+, Docker with Compose.

1. `corepack enable`
2. Copy `.env.example` to `.env` and replace placeholder secrets with random values of at least 32 characters.
3. `docker compose up -d postgres redis`
4. `pnpm install`
5. `pnpm db:generate`
6. `pnpm db:deploy`
7. Run `pnpm dev:api` and `pnpm dev:web` in separate terminals.

API: `http://localhost:4000`; web: `http://localhost:3000`.

## Important status note
The repository must not be treated as production-ready until clean-database migrations, authentication and ledger tests, lint, and TypeScript checks pass in CI. An SMS provider is required for production OTP delivery. Real-money functionality requires security and Nigerian legal/regulatory review.