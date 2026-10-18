# Deployment guide

YKB is a two-service app: a NestJS API and a Next.js web app. Both Dockerfiles use the repository root as their build context.

## Required services
- PostgreSQL database with persistent storage.
- API service built from \`apps/api/Dockerfile\`.
- Web service built from \`apps/web/Dockerfile\`.
- The web service must be able to reach the API service over the network. Set \`API_INTERNAL_URL\` on the web service to the API base URL, such as \`http://ykb-api:4000\` on a private container network or the API's HTTPS URL when separate public services are used.

## API environment variables
- \`DATABASE_URL\`: PostgreSQL connection string.
- \`NODE_ENV=production\`.
- \`ACCESS_TOKEN_SECRET\`, \`REFRESH_TOKEN_SECRET\`, and \`OTP_HMAC_SECRET\`: three different random secrets, each at least 32 characters.
- \`WEB_ORIGIN\`: the public website origin.
- \`ADMIN_PHONE_E164\`: optional administrator phone number in canonical E.164 format.
- \`SMS_PROVIDER_URL\` and \`SMS_PROVIDER_TOKEN\`: required for production OTP delivery. Confirm the provider's expected request payload; the included adapter uses a generic JSON POST and may need provider-specific mapping.
- \`FOOTBALL_API_KEY\`: optional API-Football v3 key for fixture and player-stat lookup.
- \`MAX_MARKET_LIABILITY_NAIRA=50000000\`: aggregate market exposure safeguard; this is not a per-user stake limit.

The API reads the hosting platform's \`PORT\` variable. It applies pending Prisma migrations on container startup.

## Web environment variables
- \`API_INTERNAL_URL\`: API base URL used by the same-origin \`/api/*\` proxy. Do not expose a provider key here.
- \`NODE_ENV=production\`.

Browser requests use the web origin's \`/api/*\` route, which proxies to the API and forwards the HttpOnly refresh cookie. This avoids needing a public API URL in the browser bundle.

## Local Docker build
From the repository root:

\`\`\`sh
docker build -f apps/api/Dockerfile -t ykb-api .
docker build -f apps/web/Dockerfile -t ykb-web .
\`\`\`

Set the runtime environment variables above before starting the containers. For local development, use the documented pnpm commands instead.

## Before public launch
1. Configure persistent PostgreSQL backups and a secure secret manager.
2. Configure and test an actual SMS provider adapter.
3. Add the football provider key and confirm the subscription covers the leagues and player statistics needed.
4. Test cookie behavior and allowed origins on the chosen host.
5. Run security review, load testing, and Nigerian legal/regulatory review before enabling any real-money features.
