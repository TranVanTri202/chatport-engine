export class ChannelError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class ChannelOfflineError extends ChannelError {
  constructor(public readonly botExternalId: string) {
    super(`Channel offline for bot ${botExternalId}`);
  }
}

export class ChannelExpiredError extends ChannelError {
  constructor(public readonly botExternalId: string) {
    super(`Channel expired for bot ${botExternalId}`);
  }
}

export class ChannelRateLimitedError extends ChannelError {
  constructor(public readonly retryAfterMs?: number) {
    super('Channel rate limited');
  }
}

export class ChannelSendError extends ChannelError {}

export class LockedError extends Error {
  constructor(public readonly lockKey: string) {
    super(`Resource locked: ${lockKey}`);
    this.name = 'LockedError';
  }
}
