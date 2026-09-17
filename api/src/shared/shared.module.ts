import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NestEventBusAdapter } from './infrastructure/bus/nest-event-bus.adapter.js';
import { EVENT_BUS_TOKEN } from './application/ports/event-bus.interface.js';
import { SESSION_VALIDATOR_TOKEN } from './application/ports/session-validator.interface.js';
import { StubSessionValidator } from './infrastructure/stub-session-validator.js';
import { AuthGuard } from './interface/guards/auth.guard.js';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: EVENT_BUS_TOKEN,
      useClass: NestEventBusAdapter,
    },
    {
      provide: SESSION_VALIDATOR_TOKEN,
      useClass: StubSessionValidator,
    },
    AuthGuard,
  ],
  exports: [EVENT_BUS_TOKEN, CqrsModule, SESSION_VALIDATOR_TOKEN, AuthGuard],
})
export class SharedModule {}
