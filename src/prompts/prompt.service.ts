import { Injectable } from '@nestjs/common';
import { Prompt } from '@prisma/client';
import { PromptRepository } from './repositories/prompt.repository';

export interface CreatePromptInput {
  customerId: number;
  name: string;
  template: string;
  variables?: string[];
}

export interface UpdatePromptInput {
  name?: string;
  template?: string;
  variables?: string[];
  isActive?: boolean;
}

@Injectable()
export class PromptService {
  constructor(private readonly repo: PromptRepository) {}

  list(customerId: number): Promise<Prompt[]> {
    return this.repo.findManyByCustomer(customerId);
  }

  get(id: number): Promise<Prompt | null> {
    return this.repo.findById(id);
  }

  create(input: CreatePromptInput): Promise<Prompt> {
    return this.repo.create({
      customerId: input.customerId,
      name: input.name,
      template: input.template,
      variables: input.variables ?? [],
    });
  }

  update(id: number, input: UpdatePromptInput): Promise<Prompt> {
    return this.repo.update(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.template !== undefined && {
        template: input.template,
        version: { increment: 1 },
      }),
      ...(input.variables !== undefined && { variables: input.variables }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
