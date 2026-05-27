# Telegram channel — extension point

Scaffold only. Implementation slated for the milestone after Zalo MVP.

## Conventions (per plan §9)

- **Library:** TBD (grammY hoặc telegraf). Quyết định trước khi implement, ưu tiên
  grammY vì TS-first.
- **`BotSession.payload`** schema cho Telegram:
  ```json
  { "botToken": "123:ABC..." }
  ```
- **`Bot.externalId`** = `bot.id` lấy từ `getMe()` (string hoá number).
- **Login flow:**
  1. FE collect token từ user.
  2. `POST /channels/telegram/login` (body chứa `customerId` + `botToken`).
  3. Adapter gọi `getMe()` để verify; nếu OK → save session + create Bot row.
- **Listener:**
  - Long-polling mặc định (DEV).
  - Production có thể switch sang webhook `POST /channels/telegram/webhook/:botId`
    với secret token validation.

## Extension checklist

Khi implement, **không** sửa file nào ngoài `src/channels/telegram/`:

- [ ] Implement `startLogin` — verify `botToken`, persist `BotSession.payload`,
      tạo `Bot` row, attach listener.
- [ ] Implement `restore` — đọc `BotSession.payload.botToken` → attach listener.
- [ ] Implement `send` — convert `OutboundMessage` → `sendMessage` /
      `sendPhoto` / `sendDocument`. Quote = `reply_to_message_id`.
- [ ] Implement `logout` — stop listener, xoá BotSession, set
      `Bot.status = inactive`.
- [ ] Normalize inbound: map `Update.message`/`channel_post`/`callback_query`
      sang `InboundMessage` (DTO chung).
- [ ] Listener phải push `InboundMessage` qua `MessagingPublisher.publishInbound`
      — KHÔNG chạm DB hay LLM.
