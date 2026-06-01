# AskBase Backend

AskBase Backend là service backend cho hệ thống AskBase. Dự án đang xử lý quản lý bot, prompt, tài liệu, hội thoại, messaging workflow, RAG ingestion, queue nền, realtime events và xác thực người dùng bằng Firebase (Google hiện tại, Facebook trong tương lai).

## Dự án đang làm gì
- Quản lý bot và cấu hình theo từng customer
- Lưu trữ và xử lý tài liệu phục vụ RAG
- Quản lý hội thoại, tin nhắn, participant và trạng thái đọc
- Tích hợp hàng đợi nền bằng BullMQ
- Phát realtime events qua Socket.IO
- Xác thực đăng nhập xã hội qua Firebase ID token
- Chuẩn bị kiến trúc mở rộng cho nhiều provider đăng nhập như Google và Facebook

## Tech stack
- NestJS 10
- Prisma 5
- PostgreSQL 16 + pgvector
- Redis
- BullMQ
- Socket.IO
- LangChain
- class-validator
- nestjs-pino
- Firebase Admin SDK
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
- `/auth/social-login`
- `/bots`
- `/prompts`
- `/documents`
- `/conversations`
- `/messages`
- `/health`
- `/docs`

## Authentication
Backend hiện dùng Firebase để xác thực login xã hội.

### Flow hiện tại
1. Frontend đăng nhập Google bằng Firebase.
2. Frontend nhận `idToken` từ Firebase.
3. Gửi `provider` và `idToken` về `POST /auth/social-login`.
4. Backend verify token, lấy `email`, `name`, `picture`, `firebaseUid`.
5. Backend upsert user và trả về JWT nội bộ để gọi các API khác.

### Env cần thiết cho Firebase
```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={...}
```

Hoặc có thể dùng:
```env
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

## Notes
- `AskBase_BE/.env` is required for Docker dev.
- `VITE_API_URL` is for frontend only.
