# AskBase Backend

NestJS backend for AskBase. It handles bot management, prompts, documents, conversations, messaging workflows, RAG ingestion, queues, and realtime events.

## Tech stack
- NestJS 10
- Prisma 5
- PostgreSQL 16 + pgvector
- Redis
- BullMQ
- Socket.IO
- LangChain
- Zod / class-validator
- nestjs-pino
- Zalo adapter support

## Start

### With Docker
```bash
docker compose up --build
```

### Local dev
```bash
cp .env.example .env
pnpm install
pnpm prisma migrate dev
pnpm start:dev
```

## Main endpoints
- `/bots`
- `/prompts`
- `/documents`
- `/conversations`
- `/messages`
- `/health`
- `/docs`

## Notes
- `AskBase_BE/.env` is required for Docker dev.
- `VITE_API_URL` is for frontend only.
