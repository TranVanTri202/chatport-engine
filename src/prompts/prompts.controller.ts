import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrentCustomer } from '@/shared/decorators/current-customer.decorator';
import { PromptService } from './prompt.service';

class CreatePromptDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  template!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

class UpdatePromptDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
  @IsOptional()
  @IsString()
  template?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('prompts')
@ApiBearerAuth('jwt')
@Controller('prompts')
export class PromptsController {
  constructor(private readonly prompts: PromptService) {}

  @Get()
  list(@CurrentCustomer() customerId: number) {
    return this.prompts.list(customerId);
  }

  @Post()
  create(@CurrentCustomer() customerId: number, @Body() body: CreatePromptDto) {
    return this.prompts.create({ ...body, customerId });
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePromptDto) {
    return this.prompts.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prompts.delete(id);
    return { ok: true };
  }
}
