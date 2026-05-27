# Build Prompt — Multi-Channel Bot Backend (Zalo first, Telegram next) + RAG

> Đây là PROMPT để đưa cho AI coding assistant (Claude / Cursor / Copilot) dựng project mới.
> Đọc nguyên file này và làm theo. Không bỏ bước. Không thêm scope ngoài yêu cầu.

---

## 1. Goal

Xây dựng backend NestJS quản lý **nhiều bot** thuộc **nhiều channel** (Zalo trước, Telegram sau, sau nữa có thể là Messenger/WhatsApp). Mỗi bot có thể:

1. Đăng nhập channel tương ứng (Zalo dùng QR + cookie, Telegram sẽ dùng bot token).
2. Lắng nghe tin nhắn từ user 1-1 và group.
3. Phản hồi text + ảnh.
4. Trả lời tự động bằng **LLM (OpenAI gpt-4o-mini) + RAG (pgvector)**, lấy context từ bảng `Document` của bot và **system prompt** từ bảng `Prompt` gán cho bot.

**Yêu cầu cốt lõi**:
- **Channel-agnostic core**: logic xử lý message, RAG, LLM, persistence **không được biết** mình đang xử lý Zalo hay Telegram. Chỉ duy nhất `ChannelAdapter` cụ thể của từng channel mới chạm SDK của channel đó.
- Thêm 1 channel mới = thêm 1 module implement `ChannelAdapter`, không sửa core.
- Code dễ test (DI rõ ràng, không singleton ẩn).

---

## 2. Tech stack (cố định, không thay thế)

| Concern | Lib |
|---|---|
| Framework | NestJS 10+ |
| ORM | Prisma 5+ (PostgreSQL 16+ có extension **pgvector**) |
| Queue | BullMQ qua `@nestjs/bullmq` |
| Redis | `ioredis` (dùng cho BullMQ + lock + cache) |
| WebSocket | `@nestjs/websockets` + `socket.io` |
| Zalo SDK | `zca-js@^2.0.5` |
| LLM | `openai` SDK — model `gpt-4o-mini` |
| Embedding | OpenAI `text-embedding-3-small` (1536 dims) |
| QR render | `qrcode` (chỉ cần khi muốn convert token → PNG; thường zca-js đã trả base64) |
| Validation | `class-validator` + `class-transformer` |
| Logging | `nestjs-pino` |

```bash
npm i @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config \
      @nestjs/bullmq bullmq ioredis \
      @nestjs/websockets @nestjs/platform-socket.io socket.io \
      @prisma/client \
      zca-js openai qrcode \
      class-validator class-transformer \
      nestjs-pino pino-http
npm i -D prisma @types/qrcode @types/node typescript ts-node
```

Bật pgvector trong DB:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 3. Kiến trúc

```
src/
├── main.ts
├── app.module.ts
│
├── shared/                      # primitives dùng xuyên project
│   ├── prisma/                  # PrismaService + module
│   ├── redis/                   # RedisModule (ioredis)
│   ├── config/                  # ConfigService cho env
│   └── types/                   # enum ChannelType, ThreadType, MessageDirection,…
│
├── channels/                    # ❗ CORE TRỪU TƯỢNG — không biết zalo/telegram
│   ├── channel-adapter.interface.ts     # IChannelAdapter
│   ├── channel-registry.service.ts      # Map<ChannelType, IChannelAdapter>
│   ├── channels.module.ts
│   │
│   ├── zalo/                    # 1 implementation
│   │   ├── zalo.module.ts
│   │   ├── zalo.adapter.ts             # implements IChannelAdapter
│   │   ├── zalo-session.service.ts     # cookie file/db
│   │   ├── zalo-instance.registry.ts   # Map<uid, zca-js API>
│   │   └── zalo.controller.ts          # POST /channels/zalo/login (QR)
│   │
│   └── telegram/                # STUB — chưa implement, chỉ scaffold
│       ├── telegram.module.ts
│       ├── telegram.adapter.ts         # throws NotImplementedException
│       └── README.md                   # ghi rõ extension point
│
├── messaging/                   # channel-agnostic message domain
│   ├── messaging.module.ts
│   ├── inbound.processor.ts            # BullMQ worker: incoming → handler
│   ├── outbound.processor.ts           # BullMQ worker: outgoing → adapter.send*
│   ├── message-router.service.ts       # decide handler theo threadType
│   ├── user-message.handler.ts
│   ├── group-message.handler.ts
│   └── dto/
│       ├── inbound-message.dto.ts
│       └── outbound-message.dto.ts
│
├── bot/                         # bot configuration + response orchestration
│   ├── bot.module.ts
│   ├── bot.service.ts                  # CRUD bot, gán prompt + document set
│   ├── bot-response.service.ts         # nhận InboundMessage → call RAG + LLM → enqueue outbound
│   └── dto/
│
├── rag/
│   ├── rag.module.ts
│   ├── document.service.ts             # CRUD document + chunk + embed
│   ├── chunker.service.ts              # split text → chunks
│   ├── embedding.service.ts            # OpenAI embeddings
│   ├── retrieval.service.ts            # pgvector similarity search
│   └── dto/
│
├── prompts/
│   ├── prompts.module.ts
│   ├── prompt.service.ts               # CRUD prompt templates
│   └── prompt-renderer.service.ts      # render {{variables}}
│
├── llm/
│   ├── llm.module.ts
│   └── openai.service.ts               # wrap OpenAI chat completion
│
├── realtime/
│   ├── realtime.module.ts
│   └── realtime.gateway.ts             # Socket.IO push QR + tin nhắn realtime
│
└── conversations/
    ├── conversations.module.ts
    ├── conversation.service.ts         # thread, participant, message persistence
    └── message.service.ts
```

---

## 4. ChannelAdapter — interface trung tâm

**File**: `src/channels/channel-adapter.interface.ts`

```ts
import { ChannelType, ThreadType } from '@/shared/types';

export interface ChannelCredentialsHint {
  /** Channel-specific payload returned to FE (e.g. QR base64 cho Zalo, deep-link cho Telegram). */
  kind: 'qr' | 'token' | 'link' | 'none';
  data?: unknown;
}

export interface InboundMessage {
  channel: ChannelType;
  botExternalId: string;          // uid bot trên channel (zalo uid / telegram bot id)
  threadId: string;               // user uid hoặc group id
  threadType: ThreadType;         // 'user' | 'group'
  senderExternalId: string;       // ai gửi
  senderName?: string;
  messageExternalId: string;      // msgId của channel — dùng dedup
  timestamp: number;              // epoch ms
  text?: string;                  // null nếu chỉ media
  attachments: Array<{
    type: 'image' | 'video' | 'file' | 'voice' | 'sticker' | 'location' | 'link';
    url?: string;
    mime?: string;
    size?: number;
    meta?: Record<string, unknown>;
  }>;
  quote?: { messageExternalId: string; text?: string };
  mentions?: string[];            // external ids
  raw: unknown;                   // payload gốc — debug only, không leak ra ngoài channel layer
}

export interface OutboundMessage {
  threadId: string;
  threadType: ThreadType;
  text?: string;
  attachments?: Array<{ url: string; caption?: string }>;
  quote?: { messageExternalId: string };
}

export interface SendResult {
  messageExternalId: string | null;
  sentAt: number;
}

export interface IChannelAdapter {
  readonly channel: ChannelType;

  /** Bắt đầu flow đăng nhập. Trả về hint để FE hiển thị (QR / link / token form). */
  startLogin(input: { customerId: number }): Promise<{
    sessionId: string;            // ID nội bộ để FE bind socket room
    hint: ChannelCredentialsHint;
  }>;

  /** Khôi phục bot từ session đã lưu (gọi khi NestJS bootstrap). */
  restore(botId: number): Promise<void>;

  /** Đăng xuất, đóng listener, dọn session. */
  logout(botId: number): Promise<void>;

  /** Gửi text/image/file. Adapter tự handle attachment upload riêng của channel. */
  send(botExternalId: string, msg: OutboundMessage): Promise<SendResult>;

  /** Trạng thái runtime của 1 bot (online/offline/expired). */
  status(botExternalId: string): Promise<'online' | 'offline' | 'expired'>;

  /**
   * Adapter PHẢI tự attach listener của channel rồi normalize event sang InboundMessage,
   * push vào BullMQ queue `messaging-inbound` (qua MessagingPublisher injected vào adapter).
   * Core sẽ không subscribe SDK của channel.
   */
}
```

**Bắt buộc**: mọi field `external*` là string (Zalo uid là string số, Telegram chat_id là number → convert sang string). Core dùng string đồng nhất.

`ChannelRegistry` chỉ là Map:
```ts
@Injectable()
export class ChannelRegistry {
  private readonly map = new Map<ChannelType, IChannelAdapter>();
  register(a: IChannelAdapter) { this.map.set(a.channel, a); }
  get(c: ChannelType): IChannelAdapter {
    const a = this.map.get(c);
    if (!a) throw new Error(`No adapter for channel ${c}`);
    return a;
  }
}
```

Mỗi adapter module gọi `registry.register(this)` trong `onModuleInit`.

---

## 5. Prisma schema (channel-agnostic)

`prisma/schema.prisma`:

```prisma
generator client { provider = "prisma-client-js" previewFeatures = ["postgresqlExtensions"] }
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

enum ChannelType { zalo telegram }     // mở rộng thêm sau
enum ThreadType  { user group }
enum MessageDirection { in out }
enum BotStatus { active inactive expired }

model Customer {
  id        Int      @id @default(autoincrement())
  name      String
  bots      Bot[]
  documents Document[]
  prompts   Prompt[]
}

model Bot {
  id             Int          @id @default(autoincrement())
  customerId     Int
  channel        ChannelType
  externalId     String       // uid trên channel
  name           String?
  avatar         String?
  status         BotStatus    @default(inactive)
  promptId       Int?         // system prompt mặc định
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  customer       Customer     @relation(fields: [customerId], references: [id])
  prompt         Prompt?      @relation(fields: [promptId], references: [id])
  session        BotSession?
  documents      BotDocument[]
  conversations  Conversation[]

  @@unique([channel, externalId])
  @@index([customerId])
}

/// 1 row / bot, payload tuỳ channel (cookie/imei/userAgent cho Zalo; token cho Telegram).
model BotSession {
  botId      Int      @id
  payload    Json     // SCHEMA-LESS, adapter tự định nghĩa
  updatedAt  DateTime @updatedAt
  bot        Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
}

model Conversation {
  id              Int          @id @default(autoincrement())
  botId           Int
  threadType      ThreadType
  threadExternalId String       // user uid hoặc group id
  title           String?
  unread          Int          @default(0)
  lastMessageAt   DateTime?
  metadata        Json         @default("{}")
  bot             Bot          @relation(fields: [botId], references: [id])
  messages        Message[]
  participants    Participant[]

  @@unique([botId, threadExternalId])
  @@index([botId, lastMessageAt])
}

model Participant {
  id              Int         @id @default(autoincrement())
  conversationId  Int
  externalId      String
  displayName     String?
  avatar          String?
  isBot           Boolean     @default(false)
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, externalId])
}

model Message {
  id                  BigInt           @id @default(autoincrement())
  conversationId      Int
  direction           MessageDirection
  senderExternalId    String?
  messageExternalId   String?          // channel-side id (dedup)
  text                String?          @db.Text
  attachments         Json             @default("[]")
  quoteOfExternalId   String?
  raw                 Json?            // optional debug
  createdAt           DateTime         @default(now())
  conversation        Conversation     @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, messageExternalId])
  @@index([conversationId, createdAt])
}

/// === RAG ===

model Document {
  id          Int             @id @default(autoincrement())
  customerId  Int
  title       String
  source      String?         // url / filename
  mimeType    String?
  rawText     String          @db.Text
  status      String          @default("pending")   // pending | embedded | failed
  metadata    Json            @default("{}")
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  customer    Customer        @relation(fields: [customerId], references: [id])
  chunks      DocumentChunk[]
  bots        BotDocument[]

  @@index([customerId])
}

model DocumentChunk {
  id          BigInt   @id @default(autoincrement())
  documentId  Int
  ordinal     Int
  content     String   @db.Text
  tokenCount  Int
  /// pgvector — KHÔNG dùng `Float[]`. Khai báo bằng Unsupported và tạo index thủ công.
  embedding   Unsupported("vector(1536)")
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([documentId, ordinal])
}

/// Join table: bot nào dùng document nào.
model BotDocument {
  botId      Int
  documentId Int
  bot        Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@id([botId, documentId])
}

model Prompt {
  id          Int      @id @default(autoincrement())
  customerId  Int
  name        String
  /// System prompt template. Có biến: {{rag_context}}, {{user_message}}, {{bot_name}},…
  template    String   @db.Text
  variables   Json     @default("[]")     // metadata cho UI
  version     Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  customer    Customer @relation(fields: [customerId], references: [id])
  bots        Bot[]
}
```

Sau `prisma migrate dev`, chạy SQL bổ sung:
```sql
CREATE INDEX IF NOT EXISTS document_chunk_embedding_idx
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## 6. Luồng inbound (channel → core)

```
Zalo SDK event
   │
   ▼
ZaloAdapter.normalize() ──► InboundMessage (DTO)
   │
   ▼
BullMQ "messaging-inbound" (jobId = `${channel}:${botExternalId}:${messageExternalId}` → dedup)
   │
   ▼
InboundProcessor
   ├─ Conversation/Participant upsert
   ├─ Message persist (direction = in)
   ├─ RealtimeGateway.emitToCustomer(customerId, 'message:new', …)
   └─ BotResponseService.maybeAutoReply(message)
            │
            ├─ skip nếu group mà bot không được mention & status_reply=false
            ├─ skip nếu message do bot tự gửi (selfListen)
            ├─ load Prompt + DocumentChunks (RAG)
            ├─ call OpenAI chat completion
            └─ enqueue OutboundMessage vào "messaging-outbound"
```

**Quy tắc bắt buộc**:
- Adapter **không** gọi LLM, **không** đụng DB ngoài session của chính nó.
- Inbound handler **không** import `zca-js` hay bất kỳ SDK channel nào.
- Dedup bằng `jobId` của BullMQ + unique `(conversationId, messageExternalId)` ở DB.

---

## 7. Luồng outbound (core → channel)

```
BotResponseService / API thủ công
   │
   ▼
MessagingPublisher.send(OutboundMessage + channel + botExternalId)
   │
   ▼
BullMQ "messaging-outbound"
   │
   ▼
OutboundProcessor
   ├─ acquire Redis lock `lock:send:${botExternalId}:${threadId}` (PX 15000, NX)
   ├─ ChannelRegistry.get(channel).send(botExternalId, msg)
   ├─ persist Message (direction = out, messageExternalId từ SendResult)
   ├─ RealtimeGateway.emitToCustomer(...)
   └─ release lock (Lua compare-and-del)
```

`OutboundProcessor` retry 3 lần với exponential backoff. Nếu adapter throw "expired" → đánh dấu `Bot.status = expired` và **không retry**.

---

## 8. Zalo adapter — chi tiết bắt buộc

### 8.1. Login QR

```ts
async startLogin({ customerId }) {
  const sessionId = randomUUID();
  // KHÔNG await để loginQR chạy nền — resolve ngay khi có QR đầu tiên
  void this.runLoginFlow(customerId, sessionId);
  return { sessionId, hint: { kind: 'qr', data: { sessionId } } };
}

private async runLoginFlow(customerId: number, sessionId: string) {
  const api = await this.zalo.loginQR({}, async (event) => {
    switch (event.type) {
      case LoginQRCallbackEventType.QRCodeGenerated:
        this.realtime.toSession(sessionId, 'qr:image', { image: event.data.image });
        break;
      case LoginQRCallbackEventType.QRCodeScanned:
        this.realtime.toSession(sessionId, 'qr:scanned', {}); break;
      case LoginQRCallbackEventType.QRCodeExpired:
      case LoginQRCallbackEventType.QRCodeDeclined:
        this.realtime.toSession(sessionId, 'qr:failed', { reason: event.type }); break;
      case LoginQRCallbackEventType.GotLoginInfo:
        this.realtime.toSession(sessionId, 'qr:success', {}); break;
    }
  });
  await this.completeLogin(customerId, api);
}
```

### 8.2. Session payload (`BotSession.payload`)
```json
{
  "cookie": [...],
  "imei": "...",
  "userAgent": "..."
}
```

### 8.3. Listener → InboundMessage

Đăng ký 7 events: `message`, `reaction`, `friend_event`, `undo`, `group_event`, `closed`, `error`.

Chỉ `message` → enqueue inbound. Còn lại có queue riêng (`messaging-side-events`) hoặc ignore tuỳ scope MVP.

Normalize content:

| Zalo | InboundMessage |
|---|---|
| `typeof msg.data.content === 'string'` | `text = content`, `attachments=[]` |
| `msg.data.msgType === 'chat.photo'` | `attachments=[{ type:'image', url: content.href }]` |
| `chat.video.msg` | `attachments=[{ type:'video', url: content.href, meta:{duration} }]` |
| `chat.attach` | `attachments=[{ type:'file', url: content.href, mime, size: content.fileSize }]` |
| `chat.voice` | `attachments=[{ type:'voice', url: content.href, size: content.fileSize }]` |
| `chat.sticker` | `attachments=[{ type:'sticker', meta: content }]` |
| `chat.link` | `attachments=[{ type:'link', url: content.href, meta:{title,thumb,description} }]` |

`threadType`: `ThreadType.User → 'user'`, `ThreadType.Group → 'group'`.

### 8.4. Sự kiện `closed` code 3003

Cookie chết. Phải:
1. `instanceRegistry.delete(uid)` (đã stop listener).
2. `prisma.bot.update({ status: 'expired' })`.
3. Push `bot:expired` qua RealtimeGateway.
4. **Không** retry login tự động.

### 8.5. Send

```ts
async send(botExternalId, msg) {
  const api = this.instanceRegistry.get(botExternalId);
  if (!api) throw new ChannelOfflineError(botExternalId);
  const threadType = msg.threadType === 'group' ? ThreadType.Group : ThreadType.User;
  const payload: any = { msg: msg.text ?? '' };
  if (msg.attachments?.length) payload.attachments = msg.attachments.map(a => a.url);
  if (msg.quote) payload.quote = { msgId: msg.quote.messageExternalId };

  const res = await Promise.race([
    api.sendMessage(payload, msg.threadId, threadType),
    timeout(10_000, 'zalo.send.timeout'),
  ]);
  return {
    messageExternalId: res?.message?.msgId ?? res?.attachment?.[0]?.msgId ?? null,
    sentAt: Date.now(),
  };
}
```

Wrap mọi lỗi của zca-js thành class lỗi của adapter (`ChannelExpiredError`, `ChannelRateLimitedError`, `ChannelSendError`). Core chỉ catch các class này.

### 8.6. Restore on boot

`ZaloModule.onApplicationBootstrap()`:
```ts
const bots = await prisma.bot.findMany({ where: { channel: 'zalo', status: { in: ['active','expired'] } }, include: { session: true } });
for (const bot of bots) {
  try {
    const { cookie, imei, userAgent } = bot.session!.payload as any;
    const api = await this.zalo.login({ cookie, imei, userAgent });
    this.instanceRegistry.set(bot.externalId, api);
    this.attachListeners(api, bot);
    await prisma.bot.update({ where:{ id: bot.id }, data:{ status:'active' } });
  } catch {
    await prisma.bot.update({ where:{ id: bot.id }, data:{ status:'expired' } });
  }
}
```

---

## 9. Telegram adapter — KHÔNG implement, chỉ scaffold

`src/channels/telegram/telegram.adapter.ts`:
```ts
@Injectable()
export class TelegramAdapter implements IChannelAdapter {
  readonly channel = ChannelType.telegram;
  async startLogin() { throw new NotImplementedException('Telegram coming soon'); }
  async restore()    { /* no-op */ }
  async logout()     { throw new NotImplementedException(); }
  async send()       { throw new NotImplementedException(); }
  async status()     { return 'offline' as const; }
}
```

`telegram/README.md` ghi rõ:
- Sẽ chọn lib sau (grammY / telegraf).
- `BotSession.payload` cho Telegram = `{ botToken: string }`.
- `externalId` = bot id (string).
- Login flow: user paste token vào form → adapter verify bằng `getMe()` → save.
- Listener: long-polling hoặc webhook (`POST /channels/telegram/webhook/:botId`).

Module vẫn được register vào ChannelRegistry để chứng minh kiến trúc plug-in OK.

---

## 10. RAG module

### 10.1. Ingestion

`DocumentService.ingest(customerId, { title, source, rawText, mimeType })`:
1. Tạo `Document` status = `pending`.
2. Enqueue job `rag-embed` (BullMQ) với `documentId`.
3. Worker:
   - Chunk bằng `ChunkerService` (target 500 tokens, overlap 50, split theo paragraph trước).
   - Batch call OpenAI `text-embedding-3-small` (≤100 chunk/batch).
   - Insert `DocumentChunk` qua **raw SQL** (Prisma không hỗ trợ vector):
     ```ts
     await prisma.$executeRaw`
       INSERT INTO "DocumentChunk" ("documentId","ordinal","content","tokenCount","embedding")
       VALUES (${docId}, ${i}, ${content}, ${tokens}, ${`[${vec.join(',')}]`}::vector)
     `;
     ```
   - Update document status = `embedded`.

### 10.2. Retrieval

`RetrievalService.search(botId, query, k=5)`:
1. Embed query.
2. Raw query:
   ```ts
   await prisma.$queryRaw<{ id: bigint; content: string; distance: number }[]>`
     SELECT dc.id, dc.content, dc.embedding <=> ${`[${vec.join(',')}]`}::vector AS distance
     FROM "DocumentChunk" dc
     JOIN "BotDocument" bd ON bd."documentId" = dc."documentId"
     WHERE bd."botId" = ${botId}
     ORDER BY distance ASC
     LIMIT ${k}
   `;
   ```
3. Trả về `[{ content, score: 1 - distance }]`.

### 10.3. Caching

Cache embedding của user query trong Redis 60s (key = sha1(query)). Tránh embed lại khi user spam.

---

## 11. Prompt + LLM

### 11.1. PromptRendererService
- Input: template + variables map.
- Engine: regex `{{var}}` (đừng dùng full Handlebars cho MVP). Throw nếu thiếu biến required.

### 11.2. BotResponseService.maybeAutoReply(message: Message, bot: Bot)

```ts
1. if (bot.promptId == null) return;                            // không cấu hình → bỏ
2. if (bot.status !== 'active') return;
3. if (group && !mentionedBot && !conversation.metadata.alwaysReply) return;
4. const prompt = await promptService.get(bot.promptId);
5. const contexts = await retrieval.search(bot.id, message.text, 5);
6. const system = renderer.render(prompt.template, {
     bot_name: bot.name ?? '',
     rag_context: contexts.map(c => c.content).join('\n---\n'),
   });
7. const history = await messageService.lastN(message.conversationId, 10);
8. const reply = await llm.chat({
     system,
     messages: history.map(...),
   });
9. await messaging.enqueueOutbound({
     channel: bot.channel, botExternalId: bot.externalId,
     threadId: conversation.threadExternalId,
     threadType: conversation.threadType,
     text: reply,
   });
```

Default template:
```
Bạn là {{bot_name}}, trợ lý chăm sóc khách hàng. Trả lời ngắn gọn, tiếng Việt.

Bối cảnh từ tài liệu (nếu có, hãy ưu tiên):
---
{{rag_context}}
---

Nếu không có thông tin trong bối cảnh, nói rõ là bạn không chắc.
```

### 11.3. OpenAI wrapper
- Model `gpt-4o-mini` mặc định, override qua env `LLM_MODEL`.
- Max output 800 token.
- Set `temperature: 0.3`.
- Timeout 20s, retry 1 lần khi `429`/`5xx`.

---

## 12. Realtime gateway

`RealtimeGateway` (Socket.IO namespace `/realtime`):
- Authenticate bằng JWT trong handshake.
- Rooms:
  - `customer:{customerId}` — broadcast event của tất cả bot thuộc customer.
  - `session:{sessionId}` — riêng cho QR login flow.
- Events emit từ server:
  - `qr:image`, `qr:scanned`, `qr:success`, `qr:failed`
  - `message:new` (inbound + outbound), `message:sent`, `bot:expired`

---

## 13. REST API tối thiểu

```
POST   /auth/login                            (giả định JWT có sẵn)

GET    /bots                                  list bot của customer
POST   /bots                                  tạo bot (chưa active)
PATCH  /bots/:id                              gán promptId, đổi tên
DELETE /bots/:id
POST   /bots/:id/documents                    body: { documentIds: number[] } — attach

POST   /channels/:channel/login               start login flow → { sessionId, hint }
POST   /channels/:channel/logout/:botId

POST   /messages/send                         body: { botId, threadId, threadType, text?, attachments? }

POST   /documents                             upload/ingest text doc
GET    /documents
DELETE /documents/:id
POST   /documents/:id/reembed

GET    /prompts
POST   /prompts
PATCH  /prompts/:id
DELETE /prompts/:id
```

Tất cả endpoint dùng `class-validator` DTO. Channel route ở dưới `/channels/:channel` để khi thêm Telegram không cần phát minh URL mới.

---

## 14. Concurrency & ordering rules (BẮT BUỘC)

1. **Inbound dedup**: BullMQ `jobId = ${channel}:${botExternalId}:${messageExternalId}`. Worker `removeOnComplete: 1000, removeOnFail: 5000`.
2. **Outbound order**: Redis lock per `(channel, botExternalId, threadId)`, TTL 15s, Lua compare-and-del. Worker concurrency 5 nhưng job sẽ tự throw `LockedError` → BullMQ retry.
3. **Rate limit outbound**: `limiter: { max: 5, duration: 1000 }` ở queue `messaging-outbound`.
4. **Idempotent persistence**: dùng `prisma.message.upsert` theo `(conversationId, messageExternalId)`.
5. **Self-message**: nếu adapter detect `senderExternalId === botExternalId` → set flag `isSelf` trong InboundMessage. Handler vẫn persist (để UI thấy) nhưng `BotResponseService` bỏ qua.

---

## 15. Bootstrap order

`AppModule` imports (đúng thứ tự):
```
ConfigModule → PrismaModule → RedisModule → BullModule.forRoot(...)
→ LlmModule → PromptsModule → RagModule
→ ConversationsModule → MessagingModule
→ ChannelsModule (đăng ký ZaloModule + TelegramModule)
→ BotModule
→ RealtimeModule
```

`onApplicationBootstrap`:
1. `ChannelRegistry` log tất cả adapter đã register.
2. Mỗi adapter `restore()` các bot active.
3. Worker BullMQ tự lên (qua `@Processor`).

---

## 16. Testing

- Mỗi service phải có unit test (Jest), mock Prisma bằng `jest-mock-extended`.
- Adapter có integration test với mock zca-js (stub `loginQR`, `sendMessage`, `listener.on`).
- E2E: 1 test cho flow `ingest document → query qua RAG → trả về chunks`.
- Coverage tối thiểu 70% cho `bot/`, `messaging/`, `rag/`.

---

## 17. Environment variables

```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMS=1536
JWT_SECRET=...
SOCKET_CORS_ORIGIN=https://app.example.com
```

`ConfigModule` `validationSchema` bằng `Joi` hoặc `class-validator`.

---

## 18. Definition of Done

Coi như xong khi:

1. ✅ `npm run start:dev` không error, log đủ `ChannelRegistry registered: [zalo, telegram]`.
2. ✅ Login Zalo bằng QR, scan thật, bot `active`, listener nhận được tin nhắn từ máy khác và lưu vào `Message`.
3. ✅ Restart service → bot vẫn `active`, listener tự reattach.
4. ✅ Ingest 1 doc PDF text → `DocumentChunk` có embedding khác null, `RetrievalService.search` trả về top-k đúng.
5. ✅ Gán prompt + document cho bot → user nhắn bot trên Zalo → bot trả lời tự động qua LLM với context.
6. ✅ Gọi `POST /messages/send` với image URL → ảnh đến đúng user/group Zalo.
7. ✅ Logout → `Bot.status = inactive`, session bị xoá, instance không còn trong registry.
8. ✅ `TelegramAdapter` chưa implement nhưng đã có trong registry, gọi `startLogin` trả về `NotImplementedException` rõ ràng (không 500 silent).
9. ✅ Thử thêm 1 channel mock thứ 3 (vd `MockAdapter`) chỉ cần thêm module, **không phải sửa** `messaging/`, `bot/`, `rag/`.
10. ✅ Unit test pass, coverage ≥ 70% các package core.

---

## 19. Không được làm

- Không import `zca-js` ngoài thư mục `src/channels/zalo/`.
- Không nhét logic LLM/RAG vào adapter.
- Không tạo singleton global ngoài DI.
- Không dùng `any` trong DTO core (chỉ `unknown` cho `raw` payload).
- Không lưu cookie/secret vào `Message.raw` (sanitize trước khi persist).
- Không emit tới socket trong adapter; chỉ emit trong `MessagingProcessor` / `RealtimeGateway`.
- Không tự tạo bảng riêng `ZaloMessage`/`TelegramMessage` — domain phải dùng chung `Message`/`Conversation`.

---

## 20. Tham chiếu codebase legacy

Khi cần hiểu hành vi thực tế của Zalo (event payload, edge case), xem code Express cũ:

| Chủ đề | File |
|---|---|
| Login QR | [src/utils/qrUtils.js](src/utils/qrUtils.js), [src/services/bot/social/zalo.bot.service.js](src/services/bot/social/zalo.bot.service.js) |
| Cookie | [src/utils/cookiesUtils.js](src/utils/cookiesUtils.js), [src/utils/applicationCache.js](src/utils/applicationCache.js) |
| Listener registration | [src/services/transService.js](src/services/transService.js) |
| Message handler | [src/services/listeners/messageListener.js](src/services/listeners/messageListener.js), [src/services/listeners/subs/user.listener.js](src/services/listeners/subs/user.listener.js), [src/services/listeners/subs/group.listener.js](src/services/listeners/subs/group.listener.js) |
| Send user | [src/services/external/zca-actions/UserActions.js](src/services/external/zca-actions/UserActions.js) |
| Send group | [src/services/external/zca-actions/GroupActions.js](src/services/external/zca-actions/GroupActions.js) |
