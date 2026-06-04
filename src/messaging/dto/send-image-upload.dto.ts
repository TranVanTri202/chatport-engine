export class SendImageUploadDto {
  botExternalId!: string;
  threadId!: string;
  threadType!: 'user' | 'group';
  caption?: string;
  quoteMessageExternalId?: string;
}
