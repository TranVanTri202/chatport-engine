import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ChannelType } from '@/shared/types';

export const BotExternal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ params: Record<string, string> }>();
    const channel = req.params.channel as ChannelType | undefined;
    const externalId = req.params.externalId;

    if (!channel || !externalId) {
      throw new BadRequestException('channel and externalId are required');
    }

    return { channel, externalId };
  },
);
