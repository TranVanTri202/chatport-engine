import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Global wrapper around `@nestjs/event-emitter`.
 * `wildcard: true` + `delimiter: '.'` so listeners can subscribe to
 * `bot.**` or `message.*` for cross-cutting concerns (audit, metrics).
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}
