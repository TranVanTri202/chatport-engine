-- Chạy SAU `prisma migrate dev` (Prisma không hiểu kiểu vector).
-- Có thể đưa thành migration thủ công sau khi đã có migration đầu.

CREATE INDEX IF NOT EXISTS document_chunk_embedding_idx
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
