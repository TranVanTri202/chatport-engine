import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AppConfig } from '@/shared/config/app.config';
export declare class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly config;
    private readonly prisma;
    private readonly logger;
    server: Server;
    constructor(jwt: JwtService, config: AppConfig, prisma: PrismaService);
    afterInit(): void;
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): void;
    subscribeSession(socket: Socket, payload: {
        sessionId: string;
    }): Promise<void>;
    emitToCustomer(customerId: number, event: string, data: unknown): void;
    toSession(sessionId: string, event: string, data: unknown): void;
    emitToBot(botId: number, event: string, data: unknown): Promise<void>;
}
