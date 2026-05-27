# WorkGPT Zalo — Multi-Channel Bot Backend

NestJS backend per `plan.md`. Channel-agnostic core + Zalo adapter (Telegram
scaffold), RAG over pgvector, BullMQ workers, Socket.IO realtime.

> Đây mới là **scaffold codebase**. Chưa `pnpm install`, chưa migrate, chưa
> chạy. Mọi adapter SDK call (zca-js) đang là `TODO` để tránh phụ thuộc khi
> thư viện chưa được install.

## Stack

- NestJS 10 · Prisma 5 (Postgres 16 + pgvector) · BullMQ · ioredis ·
  Socket.IO · **LangChain** (`@langchain/openai` for chat + embeddings,
  `@langchain/textsplitters` for chunking) · `zca-js` (Zalo) ·
  class-validator · nestjs-pino

## Document ingestion

Three ways to feed text into RAG. All three end at the same pipeline:
`load → persist Document (status=pending) → enqueue rag-embed job → chunk →
batch embed → INSERT vector rows → status=embedded`.

### 1. Plain text — `POST /documents`

```json
{ "customerId": 1, "title": "FAQ", "rawText": "...", "source": "wiki" }
```

### 2. File upload — `POST /documents/upload` (multipart)

Form fields: `file` (binary), `customerId`, optional `title`.
Supported: **PDF · DOCX · XLSX · CSV · TXT · MD · HTML**. Max **20 MB**.

```bash
curl -X POST http://localhost:3000/documents/upload \
  -H "Authorization: Bearer $JWT" \
  -F "customerId=1" \
  -F "file=@./policy.pdf"
```

XLSX → mỗi sheet được export thành CSV block, prefix `# Sheet: {name}`.
HTML → strip tag (giữ text). Extractors: `pdf-parse`, `mammoth`, `xlsx`.

### 3. Google Docs / Sheets public link — `POST /documents/import-url`

Document phải share *"anyone with the link can view"*. Không cần OAuth.

```json
{
  "customerId": 1,
  "url": "https://docs.google.com/document/d/{ID}/edit",
  "title": "Optional override"
}
```

- Docs → `…/export?format=txt`
- Sheets → `…/export?format=csv&gid={GID}` (gid trong URL hoặc default 0,
  một tab/lần — nhiều tab thì gọi nhiều lần).

Drive private (OAuth) chưa có — sẽ thêm sau như một loader riêng.

## Chunking

LangChain `RecursiveCharacterTextSplitter`:

| Tham số       | Giá trị     | Tương đương        |
| ------------- | ----------- | ------------------ |
| chunkSize     | 2000 chars  | ≈ 500 tokens       |
| chunkOverlap  | 200 chars   | ≈ 50 tokens        |
| separators    | mặc định    | paragraph → sentence → word → char |

Heuristic 1 token ≈ 4 chars dùng cho `tokenCount` column (hiển thị + sau
này để budgeting). Embedding model tự tokenize cho việc embed thật.

Không có strategy per-mime: PDF/DOCX/XLSX đều plain text về cùng splitter.

## Per-bot quota (trial)

Each bot ships with `requestQuota=30` and `documentQuota=2` defaults. Bump
via `PATCH /bots/:id` for paid customers (or add a dedicated admin endpoint
later).

| Column          | Default | Meaning |
| --------------- | ------- | --- |
| `requestQuota`  | 30      | Hard cap on total auto-replies + manual sends. |
| `requestUsed`   | 0       | Counter — atomically incremented per call. |
| `documentQuota` | 2       | Max `BotDocument` attachments per bot. |

**Enforcement:**

- **Auto-reply** (`BotResponseService`): tries
  `QuotaService.consumeRequest(botId)` BEFORE any LLM/RAG work. Quota
  exhausted → silently skips reply (the inbound message is still persisted
  + emitted on socket; UI sees the user's message, bot just doesn't answer).
- **Manual send** (`SendMessageHandler`): same call. Quota exhausted →
  `402 Payment Required` body
  `{ok:false, error:{code:"QUOTA_REQUEST_EXCEEDED", detail:{kind,botId,used,limit}, requestId}}`.
- **Attach documents** (`BotService.attachDocuments`): pre-flight check —
  counts only NEW pairs (re-attaching an already-attached doc is a free
  no-op). Exceeds → `402 QUOTA_DOCUMENT_EXCEEDED`.

Atomic increment uses raw SQL
`UPDATE "Bot" SET "requestUsed" = "requestUsed" + 1 WHERE id = $1 AND "requestUsed" < "requestQuota" RETURNING …`
so concurrent replies can't overshoot the cap.

## Per-bot LLM settings

Every knob is configured on the Bot row (`PATCH /bots/:id`) and falls back
to env defaults when null. Nothing hard-coded.

| Bot column         | Env default            | Bounds   |
| ------------------ | ---------------------- | -------- |
| `llmModel`         | `LLM_MODEL`            | string   |
| `temperature`      | `LLM_TEMPERATURE`      | 0 – 2    |
| `maxTokens`        | `LLM_MAX_TOKENS`       | 1 – 8192 |
| `topP`             | `LLM_TOP_P`            | 0 – 1    |
| `frequencyPenalty` | `LLM_FREQUENCY_PENALTY`| -2 – 2   |
| `presencePenalty`  | `LLM_PRESENCE_PENALTY` | -2 – 2   |
| `ragTopK`          | `RAG_TOP_K`            | 1 – 50   |
| `settings` (JSON)  | —                      | free-form forward-compat bag |

Example:

```http
PATCH /bots/42
Content-Type: application/json

{
  "settings": {
    "llmModel": "gpt-4o",
    "temperature": 0.1,
    "maxTokens": 1200,
    "ragTopK": 8
  }
}
```

## Quick start

```bash
cp .env.example .env
# điền OPENAI_API_KEY, JWT_SECRET

# 1. Bring up Postgres + Redis + app skeleton
docker compose up -d postgres redis

# 2. Install deps & migrate (host machine)
pnpm install
pnpm prisma migrate dev --name init
# pgvector ivfflat index (Prisma không hiểu kiểu vector)
docker compose exec -T postgres psql -U workgpt -d workgpt -f - < prisma/sql/01-vector-index.sql

# 3. Run
pnpm start:dev
# hoặc dùng container dev
docker compose up app
```

## Project layout

```
src/
├── main.ts                                     # BigInt patch + Swagger + listen
├── app.module.ts                                # globals: Filter, Interceptor, ThrottlerGuard, JwtAuthGuard
│
├── auth/                                        # JWT + @Public + JwtAuthGuard (populates CLS customerId)
├── health/                                      # @nestjs/terminus → /health/live + /health/ready
├── shared/
│   ├── config/   prisma/   redis/   types/   utils/  errors/
│   ├── context/                                 # nestjs-cls → request-scoped CustomerId, RequestId
│   ├── decorators/  current-customer.decorator
│   ├── events/                                  # DOMAIN_EVENTS + payload types + EventsModule
│   ├── filters/                                 # GlobalExceptionFilter (Http/Prisma/Channel/Locked)
│   ├── interceptors/                            # LoggingInterceptor (X-Request-Id + duration)
│   ├── swagger/                                 # /docs setup
│   └── throttler/                               # short+long window global rate limits
│
├── channels/                                    # channel-agnostic core
│   ├── channel-adapter.interface.ts             # IChannelAdapter
│   ├── channel-registry.service.ts              # Map<ChannelType, IChannelAdapter>
│   ├── channel-core.module.ts                   # @Global wrapper so adapters avoid cycles
│   ├── zalo/   (ONLY place allowed to import zca-js)
│   └── telegram/  (scaffold; throws NotImplementedException)
│
├── messaging/                                   # queues + workers + handlers + commands
│   ├── inbound.processor.ts                     # @OnWorkerEvent('failed') log
│   ├── outbound.processor.ts                    # Redis lock + rate limit + worker events + emit MessageSent/BotStatusChanged
│   ├── message.handler.ts                       # SINGLE handler (was User+Group) — emits DOMAIN_EVENTS.MessageReceived
│   ├── reply-policy.service.ts                  # text-only + group-mention rule (unit-testable)
│   ├── messaging.publisher.ts                   # enqueue helpers
│   └── commands/                                # @nestjs/cqrs: SendMessageCommand + handler
│
├── conversations/                               # Conversation + Message persistence (channel-agnostic, SHARED)
├── bot/
│   ├── bot.service.ts → bot.repository.ts       # Service ⟶ Repository split
│   └── bot-response.service.ts                  # @OnEvent('message.received') listener
├── rag/
│   ├── document.service.ts → document.repository.ts
│   ├── loaders/  (file: pdf/docx/xlsx/csv/txt/html · google-docs/sheets public URL · facade)
│   └── embed.processor.ts                       # emits DocumentStatusChanged
├── prompts/
│   └── prompt.service.ts → prompt.repository.ts
├── llm/                                         # LangChain ChatOpenAI wrapper, per-call overrides
└── realtime/
    ├── realtime.gateway.ts                      # Socket.IO /realtime namespace
    └── realtime.listener.ts                     # bridge DOMAIN_EVENTS → socket emit (decoupled)
```

## REST API surface

```
POST   /auth/login                          → { accessToken }     (placeholder)

GET    /bots                                list bots of current customer
GET    /bots/:id                            detail + counts + quota usage + lastMessageAt
POST   /bots                                create
PATCH  /bots/:id                            update (name, promptId, settings, quotas)
DELETE /bots/:id

GET    /bots/:id/documents                  list attached documents
POST   /bots/:id/documents                  body: { documentIds: number[] }  (quota-checked)
DELETE /bots/:id/documents/:docId           detach

GET    /conversations?botId=&limit=&cursor= cursor pagination by lastMessageAt desc
GET    /conversations/:id                   detail + participants
GET    /conversations/:id/messages?cursor=&limit= cursor pagination (BigInt as string)
POST   /conversations/:id/read              reset unread counter

POST   /messages/send                       enqueue outbound (quota-checked)

POST   /channels/:channel/login             start login (Zalo QR / Telegram TBD)
POST   /channels/:channel/logout/:botId
POST   /channels/zalo/login                 shortcut
POST   /channels/zalo/logout/:botId

POST   /documents                           plain-text ingest
POST   /documents/upload                    multipart PDF/DOCX/XLSX/CSV/TXT/MD/HTML
POST   /documents/import-url                Google Docs/Sheets public link
GET    /documents                           list (customer scope)
DELETE /documents/:id
POST   /documents/:id/reembed

GET    /prompts                             CRUD …
POST   /prompts
PATCH  /prompts/:id
DELETE /prompts/:id

GET    /health/live                         k8s liveness
GET    /health/ready                        Prisma + Redis ping
GET    /docs                                Swagger UI
```

All endpoints (except `/auth/login`, `/health/*`, `/docs`) require
`Authorization: Bearer <JWT>`. `customerId` is read from the token via
`@CurrentCustomer()` — never trust a query/body field for tenant identity.

## NestJS features in use

| Feature | Where | Why |
| --- | --- | --- |
| **Global Exception Filter** | [global-exception.filter.ts](src/shared/filters/global-exception.filter.ts) | Uniform `{ok:false, error:{code,message,requestId}}` envelope. Maps Channel*Error, Prisma codes, Http. |
| **Global Logging Interceptor** | [logging.interceptor.ts](src/shared/interceptors/logging.interceptor.ts) | `X-Request-Id` reuse/generate + duration log. Same ID surfaces in error bodies. |
| **CLS request context** | [cls.module.ts](src/shared/context/cls.module.ts) | `customerId` from JWT available anywhere via `ClsService.get(CTX.CustomerId)`. |
| **`@CurrentCustomer()` decorator** | [current-customer.decorator.ts](src/shared/decorators/current-customer.decorator.ts) | No more `?customerId=` query param — single source of truth = JWT. |
| **Event Emitter** | [events.module.ts](src/shared/events/events.module.ts) + [domain-events.ts](src/shared/events/domain-events.ts) | `MessageReceived` / `MessageSent` / `BotStatusChanged` / `DocumentStatusChanged`. BotResponse, Realtime, future audit/webhook listeners all subscribe — no coupling. |
| **CQRS** | [send-message.command.ts](src/messaging/commands/send-message.command.ts) | `MessagesController` dispatches a command instead of calling publisher directly. Demonstrates the seam; expand if you add more commands. |
| **Repository pattern** | `*/repositories/` | Service mocks repo (not Prisma) in tests. Bot/Document/Prompt all split. |
| **Health check** | [health.module.ts](src/health/health.module.ts) | `/health/live` + `/health/ready` (Prisma ping + Redis ping). |
| **Throttler** | [throttler.module.ts](src/shared/throttler/throttler.module.ts) | 20 req/s burst + 200 req/min sustained global; override per-route with `@Throttle`. |
| **Swagger / OpenAPI** | [swagger.ts](src/shared/swagger/swagger.ts) | `/docs` UI, bearer auth, persists token across reloads. |
| **BullMQ `@OnWorkerEvent`** | all 3 processors | `failed` + `stalled` logged with attempt count. |
| **BigInt JSON serialization** | [bigint-serializer.ts](src/shared/utils/bigint-serializer.ts) | `Message.id` is `BigInt` — without patch, JSON.stringify throws. |
| **Forward references** | `forwardRef(() => MessagingModule)` etc. | Messaging ⇄ Bot, Messaging ⇄ Zalo cycles cleanly resolved. |
| **Validation pipe** | `main.ts` | `whitelist + forbidNonWhitelisted + transform + implicitConversion`. |
| **Global guards** | `app.module.ts` | `ThrottlerGuard` → `JwtAuthGuard` (with `@Public()` opt-out). |

## Event flow (channel-agnostic, decoupled)

```
Inbound (Zalo adapter normalize → BullMQ inbound queue)
   ↓
MessageHandler                                          ← SINGLE handler for user+group
   1. upsert Conversation/Participant
   2. persistInbound (idempotent on messageExternalId)
   3. emit DOMAIN_EVENTS.MessageReceived               ─┐
                                                         ├─→ RealtimeListener → socket 'message:new'
                                                         ├─→ BotResponseService (gated by ReplyPolicy + status + prompt)
                                                         │     ├─ RAG retrieve (top-K per bot)
                                                         │     ├─ LangChain ChatOpenAI (per-bot overrides)
                                                         │     └─ SendMessageCommand
                                                         │             ↓
                                                         │       SendMessageHandler → enqueue outbound
                                                         └─→ (audit/webhook listeners — add freely)

Outbound (worker → Redis lock per (bot,thread) → adapter.send)
   ↓
   on success: emit DOMAIN_EVENTS.MessageSent          ─→ RealtimeListener → socket 'message:sent'
   on ChannelExpired: Bot.status = expired
                      emit DOMAIN_EVENTS.BotStatusChanged ─→ RealtimeListener → socket 'bot:status'
```

**Adding a listener** (e.g. AuditLogService) = new `@Injectable()` with
`@OnEvent(DOMAIN_EVENTS.MessageReceived)`. Zero touch on handler, processor,
or any other listener.

## Architectural invariants (per plan §19)

- `zca-js` is imported **only** under `src/channels/zalo/`.
- Adapters call **only** `MessagingPublisher` (and their own session helpers);
  never LLM, never RAG, never `Conversation`/`Message` directly.
- Core (`messaging`, `bot`, `rag`, `conversations`) never imports any channel
  SDK; new channel = new module + `ChannelRegistry.register(this)`.
- Inbound dedup via BullMQ `jobId = ${channel}:${botExternalId}:${messageExternalId}`
  + Prisma unique `(conversationId, messageExternalId)`.
- Outbound ordering via Redis lock `lock:send:${botExternalId}:${threadId}`
  with Lua compare-and-del release.

## Still TODO (post-scaffold)

- [ ] Implement `ZaloAdapter.startLogin` + `restore` + `send` + `logout`
      using `zca-js` (currently throws/logs).
- [ ] Implement `ZaloListeners.attach` (subscribe 7 events).
- [ ] Telegram adapter (see `src/channels/telegram/README.md`).
- [ ] Google Drive (OAuth) loader for private Docs/Sheets.
- [ ] Generic web URL loader (cheerio extraction).
- [ ] Unit + e2e tests per plan §16 (coverage ≥ 70% on core packages).
- [ ] Real auth provider; current `/auth/login` mints a JWT from `customerId`.
- [ ] `prisma/migrations/*` — run `prisma migrate dev` once deps are installed.
