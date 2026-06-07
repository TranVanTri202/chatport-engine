import { Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AppConfig } from '@/shared/config/app.config';
import { REALTIME_NAMESPACE } from '@/shared/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZaloZcaService } from '@/channels/zalo/zalo-zca.service';

interface SocketData {
  customerId?: number;
}

@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
  cors: { origin: '*', credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly zaloZca: ZaloZcaService,
  ) {}

  afterInit(): void {
    // CORS for namespace handled via gateway options above; if more granular
    // origin control is needed, configure `server.engine.opts.cors` here.
    const engine = this.server?.engine as { opts?: { cors?: { origin?: string; credentials?: boolean } } } | undefined;
    if (engine?.opts) {
      engine.opts.cors = {
        origin: this.config.socketCorsOrigin,
        credentials: true,
      };
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        (socket.handshake.headers.authorization?.replace(/^Bearer /, '') as
          | string
          | undefined);
      if (!token) throw new UnauthorizedException();
      const payload = await this.jwt.verifyAsync<{ customerId: number }>(token, {
        secret: this.config.jwtSecret,
      });
      (socket.data as SocketData).customerId = payload.customerId;
      socket.join(`customer:${payload.customerId}`);
      this.logger.debug(`socket ${socket.id} joined customer:${payload.customerId}`);
    } catch (err) {
      this.logger.warn(`socket ${socket.id} auth failed: ${(err as Error).message}`);
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`socket ${socket.id} disconnected`);
  }

  @SubscribeMessage('session:subscribe')
  async subscribeSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string },
  ): Promise<void> {
    if (!payload?.sessionId) return;
    await socket.join(`session:${payload.sessionId}`);
  }

  @SubscribeMessage('agent:typing')
  async handleAgentTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { botExternalId: string; threadId: string; threadType: 'user' | 'group'; isTyping: boolean },
  ): Promise<void> {
    const customerId = (socket.data as SocketData).customerId;
    if (!customerId) return;

    this.logger.debug(`Agent typing: customerId=${customerId} bot=${payload.botExternalId} threadId=${payload.threadId} typing=${payload.isTyping}`);
    this.eventEmitter.emit('agent.typing', {
      customerId,
      botExternalId: payload.botExternalId,
      threadId: payload.threadId,
      threadType: payload.threadType,
      isTyping: payload.isTyping,
    });
  }

  @SubscribeMessage('user:lastOnline:request')
  async handleLastOnlineRequest(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { botExternalId: string; convoId?: string; uid: string },
  ): Promise<void> {
    const customerId = (socket.data as SocketData).customerId;
    if (!customerId || !payload?.botExternalId || !payload?.uid) return;

    try {
      const result = await this.zaloZca.getLastOnline(payload.botExternalId, payload.uid);
      this.server.to(`customer:${customerId}`).emit('user:lastOnline:response', {
        convoId: payload.convoId,
        uid: payload.uid,
        online: result?.online ?? false,
        lastOnline: result?.lastOnline ?? null,
        presenceText: result?.presenceText ?? 'Ngoại tuyến',
      });
    } catch (err) {
      this.logger.warn(`lastOnline request failed: ${(err as Error).message}`);
      this.server.to(`customer:${customerId}`).emit('user:lastOnline:response', {
        convoId: payload.convoId,
        uid: payload.uid,
        online: false,
        lastOnline: null,
        presenceText: 'Ngoại tuyến',
      });
    }
  }

  // ---- emit helpers ----

  emitToCustomer(customerId: number, event: string, data: unknown): void {
    this.server.to(`customer:${customerId}`).emit(event, data);
  }

  toSession(sessionId: string, event: string, data: unknown): void {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }

  async emitToBot(botId: number, event: string, data: unknown): Promise<void> {
    const bot = await this.prisma.bot.findUnique({
      where: { id: botId },
      select: { customerId: true },
    });
    if (!bot) return;
    this.emitToCustomer(bot.customerId, event, { botId, ...(data as object) });
  }
}
