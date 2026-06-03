# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN pnpm prisma generate
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs
RUN touch /app/qr.png && chown nestjs:nodejs /app/qr.png

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

USER nestjs
EXPOSE 5001
CMD ["node", "dist/main.js"]
