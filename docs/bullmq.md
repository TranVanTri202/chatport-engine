# BullMQ trong chatport-engine

## Tổng quan

Dự án dùng 3 queue BullMQ, nền Redis:

| Queue | Mục đích | Concurrency | Rate Limit |
|---|---|---|---|
| `messaging-inbound` | Nhận message từ Zalo/Telegram → persist | 10 | Không |
| `messaging-outbound` | Gửi message ra Zalo/Telegram | 5 | 5 msg/s |
| `rag-embed` | Embed document → vector DB | 2 | Không |

## 1. Inbound Queue

### Flow

```
Zalo WebSocket event
  │
  ▼
ZaloListenersOrchestrator
  │  normalize → InboundMessageDto
  ▼
MessagingPublisher.publishInbound()
  │  jobId = channel:botExternalId:messageExternalId
  │  → dedup chống trùng event từ Zalo
  ▼
[messaging-inbound queue]
  │
  ▼
InboundProcessor.process()
  │
  ▼
MessageHandler.handle()
  ├─ upsert conversation  (ConversationService)
  ├─ persist message      (MessageService)
  └─ emit message.received event
       │
       ▼
  BotResponseService.onMessageReceived()
       │
       ├─ ReplyPolicyService.shouldConsider()
       │    └─ chỉ webchat/chat mới qua
       ├─ rate limit check (Redis atomic counter)
       └─ LLM generate → publishOutbound()
```

### Tại sao cần queue?

- **Không block WebSocket**: Zalo listener chạy trên 1 connection. Nếu xử lý trực tiếp (persist + LLM = 2-5s), các message khác bị delay. Queue cho phép push trong ~1ms rồi xử lý sau.
- **Dedup**: Zalo đôi khi gửi trùng event. `jobId` = `channel:botExternalId:messageExternalId` chặn duplicate.
- **Retry ngầm**: Nếu DB tạm lỗi, job retry tự động.

## 2. Outbound Queue

### Flow

```
BotResponseService.generateReply()
  │  LLM reply text
  ▼
MessagingPublisher.publishOutbound()
  │  attempts: 3, backoff exponential
  │  removeOnComplete: 1000
  ▼
[messaging-outbound queue]
  │  limiter: 5 msg/s
  ▼
OutboundProcessor.process()
  ├─ acquire Redis lock (NX, 15s TTL)
  │    └─ lock:send:botExternalId:threadId
  │    └─ chống race: 2 worker không gửi cùng lúc 1 conversation
  ├─ adapter.send() → Zalo API
  └─ release lock (Lua script atomic)
```

### Tại sao cần queue?

- **Rate limit**: Zalo API giới hạn tần suất gửi. Không rate limit → bot trong group 100 người chat cùng lúc → spam → khóa tài khoản. BullMQ limiter: 5 msg/s.
- **Retry khi lỗi**: Zalo API có thể tạm lỗi. Retry 3 lần, exponential backoff (1s, 2s, 4s).
- **Distributed lock**: Nếu nhiều worker, 2 message cùng conversation có thể gửi đồng thời → sai thứ tự. Redis lock đảm bảo tuần tự.
- **ChannelExpired**: Nếu token Zalo hết hạn, processor bắt lỗi → mark bot expired → dừng gửi.

## 3. Embed Queue

### Flow

```
DocumentService.ingest()
  │  create document (status: pending)
  ▼
Queue.add('embed', { documentId })
  │
  ▼
[rag-embed queue]
  │  concurrency: 2 (embedding API rate limit)
  ▼
EmbedProcessor.process()
  ├─ chunker.chunk(rawText) → split thành đoạn
  ├─ embeddings.embedBatch(chunks) → vector
  ├─ chunkRepo.replaceChunks(batch insert raw SQL)
  ├─ docRepo.update(status: 'embedded')
  └─ emit DocumentStatusChanged event
```

### Tại sao cần queue?

- **Embedding là CPU/network nặng**: Mỗi document có thể mất 30-60s để embed. Không nên block HTTP request.
- **Retry khi lỗi**: Embedding API có thể timeout. Retry tự động.
- **Concurrency giới hạn**: Embedding API (OpenAI/v.v.) có rate limit. Concurrency 2 tránh 429.

## 4. Redis hỗ trợ

### Distributed Lock (outbound)

```lua
-- acquireLock: SET key token PX ttl NX
-- releaseLock: atomic GET + DEL
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
```

Lock key: `lock:send:{botExternalId}:{threadId}`
TTL: 15 giây — đủ dài cho worst-case gửi Zalo, đủ ngắn để không block retry nếu worker crash.

### Rate Limit (reply)

```lua
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
```

Key: `ratelimit:reply:{conversationId}`
Window: 60 giây, max 5 replies — chống bot spam loop.

## 5. Cấu hình queue

```typescript
// app.module.ts — BullModule.forRootAsync
BullModule.forRootAsync({
  inject: [AppConfig],
  useFactory: (cfg: AppConfig) => ({
    connection: { url: cfg.redisUrl },
  }),
});

// messaging.module.ts — registerQueue
BullModule.registerQueue(
  { name: 'messaging-inbound' },
  { name: 'messaging-outbound' },
);

// rag.module.ts — registerQueue
BullModule.registerQueue({ name: 'rag-embed' });
```

## 6. Cleanup

Tất cả job đều có `removeOnComplete` và `removeOnFail` để tránh Redis đầy:

| Queue | removeOnComplete | removeOnFail |
|---|---|---|
| inbound | 1000 | 5000 |
| outbound | 1000 | 5000 |
| embed | mặc định | mặc định |

Sau khi số lượng job hoàn thành/thất bại vượt ngưỡng, các job cũ sẽ tự động bị xóa.
