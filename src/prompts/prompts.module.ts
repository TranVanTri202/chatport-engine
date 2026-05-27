import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptRendererService } from './prompt-renderer.service';
import { PromptsController } from './prompts.controller';
import { PromptRepository } from './repositories/prompt.repository';

@Module({
  controllers: [PromptsController],
  providers: [PromptService, PromptRendererService, PromptRepository],
  exports: [PromptService, PromptRendererService, PromptRepository],
})
export class PromptsModule {}
