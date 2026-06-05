import { Document, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';
export declare class DocumentRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findManyByBot(botId: number): Promise<Document[]>;
    findById(id: number): Promise<Document | null>;
    create(data: Prisma.DocumentUncheckedCreateInput): Promise<Document>;
    update(id: number, data: Prisma.DocumentUpdateInput): Promise<Document>;
    delete(id: number): Promise<Document>;
}
