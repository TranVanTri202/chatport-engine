import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListConversationsQuery {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  botId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Cursor = last seen conversation `id` (paginate older). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number;
}

export class ListMessagesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Cursor = last seen message `id` (BigInt as string). */
  @IsOptional()
  cursor?: string;
}
