import { Strategy } from 'passport-jwt';
import { AppConfig } from '@/shared/config/app.config';
import { PrismaService } from '@/shared/prisma/prisma.service';
export interface JwtPayload {
    sub: number;
    customerId: number;
    email?: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(config: AppConfig, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<JwtPayload>;
}
export {};
