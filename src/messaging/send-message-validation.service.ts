import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageType } from '@/shared/types';
import { SendMessageCommand } from './commands/send-message.command';

@Injectable()
export class SendMessageValidationService {
  validate(input: SendMessageCommand['input']): void {
    if (input.type !== MessageType.chat && input.type !== MessageType.image) {
      throw new BadRequestException('Currently only chat and image messages are supported');
    }

    if (input.type === MessageType.chat) {
      this.validateChat(input.text, input.attachments?.length ?? 0);
      return;
    }

    if (input.type === MessageType.image) {
      this.validateImage(input.attachments?.length ?? 0);
    }
  }

  private validateChat(text: string | undefined, attachmentCount: number): void {
    if (!text?.trim()) {
      throw new BadRequestException('Text is required for chat messages');
    }

    if (attachmentCount > 0) {
      throw new BadRequestException('Attachments are not supported for chat messages');
    }
  }

  private validateImage(attachmentCount: number): void {
    if (attachmentCount < 1) {
      throw new BadRequestException('At least one image attachment is required for image messages');
    }

    if (attachmentCount > 10) {
      throw new BadRequestException('A maximum of 10 image attachments is allowed');
    }
  }
}
