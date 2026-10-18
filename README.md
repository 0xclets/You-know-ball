# YKB — You Know Ball

YKB is a Nigerian football player-stat Over/Under market application. This repository contains the actual API, database schema, web app, virtual-funds market engine, and role-protected market operations. It is under active development and is **not production-ready**.

## Current implementation

- pnpm monorepo: NestJS API, Next.js web app, shared TypeScript package
- PostgreSQL + Prisma migrations and local PostgreSQL/Redis Compose services
- Phone OTP request/verification with expiry, attempt limits, resend cooldown, one-time challenge consumption, and development-only code visibility
- Rotating refresh tokens with reuse detection and session-family revocation
- ₦1,000,000 virtual signup bonus, credited once to a phone-number account
- Separate virtual bonus and cash wallets; integer-kobo ledger entries
- LMSR binary Over/Under pricing with default ₦50,000 liquidity and a default 2% fee
- Authenticated virtual share buys/sells, trade history, positions, and idempotency keys
- No per-user stake limit during testing; a configurable aggregate market-liability safeguard protects the market as a whole
- Admin-only draft market creation, publishing, closing, and manual settlement
- Next.js pages for markets, market detail/trading, portfolio, wallet, sign-in, account, and administration

## Current limitations

- API-Football v3 fixture and player-stat lookup is integrated server-side. It requires `FOOTBALL_API_KEY`; no provider key is configured by default. Administrators still review and publish markets manually and must settle with verified results. No live market appears until an administrator creates and opens it.
- Termii OTP delivery is integrated for production phone verification; set `SMS_PROVIDER=termii`, `TERMII_API_KEY`, and the account-specific `TERMII_API_BASE_URL`. Development can return a local OTP when no provider is configured; production never returns it in the API response.
- Refresh tokens are now stored in an HttpOnly cookie and rotated by the API; short-lived access tokens remain in browser `sessionStorage`. Complete an independent security review, CSRF/CORS review, and production cookie-domain review before launch.
- Real-money deposits, withdrawals, and trading are disabled. Obtain Nigerian legal/regulatory advice before considering any real-money launch.
- Redis is available in local Compose, but queue/stream processing and real-time market feeds are not yet wired up.

## Local development

Requirements: Node.js 22+, pnpm 10+, Docker with Compose.

1. Enable pnpm with \`corepack enable\`.
2. Copy \`.env.example\` to the repository root as \`.env\`. Replace the placeholder secrets with independent random values of at least 32 characters.
3. Start dependencies: \`docker compose up -d postgres redis\`.
4. Install packages: \`pnpm install\`.
5. Generate the Prisma client: \`pnpm db:generate\`.
6. Apply migrations: \`pnpm db:deploy\`.
7. In one terminal, run \`pnpm dev:api\`.
8. In another terminal, create \`apps/web/.env.local\` containing \`NEXT_PUBLIC_API_URL=http://localhost:4000\`, then run \`pnpm dev:web\`.

Web: \`http://localhost:3000\`; API health check: \`http://localhost:4000/health\`.

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for the API/web Docker images and required production environment variables.

## Administrator setup

Read [\`docs/admin.md\`](docs/admin.md). Set \`ADMIN_PHONE_E164\` in the root \`.env\` to the administrator's canonical Nigerian E.164 phone number, restart the API, then complete OTP verification for that number. Admin role assignment is enforced by the API.

## API endpoints

- \`POST /auth/otp/request\`
- \`POST /auth/otp/verify\`
- \`POST /auth/refresh\`
- \`POST /auth/logout\`
- \`GET /wallet\` (Bearer access token)
- \`GET /markets\`
- \`GET /markets/:id\`
- \`POST /markets/:id/trades\` (Bearer access token; buy/sell virtual shares)
- \`GET /markets/me/positions\` and \`GET /markets/me/trades\` (Bearer access token)
- \`/admin/markets\` and related open/close/settle endpoints (ADMIN role required)

## Verification status

GitHub Actions runs the Prisma clean-database migration, TypeScript checks, and unit tests. Do not assume a phase is accepted until the latest CI run is green and the critical auth/ledger flows have been tested end-to-end.
