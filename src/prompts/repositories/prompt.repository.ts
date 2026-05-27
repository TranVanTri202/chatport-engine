import { Injectable } from '@nestjs/common';
import { Prisma, Prompt } from '@prisma/client';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class PromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByCustomer(customerId: number): Promise<Prompt[]> {
    return this.prisma.prompt.findMany({
      where: { customerId },
      orderBy: { id: 'desc' },
    });
  }

  findById(id: number): Promise<Prompt | null> {
    return this.prisma.prompt.findUnique({ where: { id } });
  }

  create(data: Prisma.PromptUncheckedCreateInput): Promise<Prompt> {
    return this.prisma.prompt.create({ data });
  }

  update(id: number, data: Prisma.PromptUpdateInput): Promise<Prompt> {
    return this.prisma.prompt.update({ where: { id }, data });
  }

  delete(id: number): Promise<Prompt> {
    return this.prisma.prompt.delete({ where: { id } });
  }
}
