import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByCustomer(customerId: number): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { customerId },
      orderBy: { id: 'desc' },
    });
  }

  findById(id: number): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  create(data: Prisma.DocumentUncheckedCreateInput): Promise<Document> {
    return this.prisma.document.create({ data });
  }

  update(id: number, data: Prisma.DocumentUpdateInput): Promise<Document> {
    return this.prisma.document.update({ where: { id }, data });
  }

  delete(id: number): Promise<Document> {
    return this.prisma.document.delete({ where: { id } });
  }
}
