export enum ChannelType {
  zalo = 'zalo',
  telegram = 'telegram',
  demo = 'demo',
}

export enum ThreadType {
  user = 'user',
  group = 'group',
}

export enum MessageType {
  chat = 'chat',
  image = 'image',
  video = 'video',
  file = 'file',
  voice = 'voice',
  sticker = 'sticker',
  link = 'link',
  unknown = 'unknown',
  pin = 'pin',
}


export enum MessageDirection {
  in = 'in',
  out = 'out',
}

export enum BotStatus {
  active = 'active',
  inactive = 'inactive',
  expired = 'expired',
}

export const MESSAGING_INBOUND_QUEUE = 'messaging-inbound';
export const MESSAGING_OUTBOUND_QUEUE = 'messaging-outbound';
export const RAG_EMBED_QUEUE = 'rag-embed';

export const REALTIME_NAMESPACE = '/realtime';
