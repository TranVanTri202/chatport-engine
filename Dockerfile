# syntax=docker/dockerfile:1.7

# ---------- base ----------
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm exec prisma generate

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# ---------- production ----------
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod
RUN pnpm exec prisma generate

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
