FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY prisma ./prisma
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm db:generate && pnpm --filter @ykb/api build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["sh", "-c", "pnpm db:deploy && pnpm --filter @ykb/api start:prod"]
