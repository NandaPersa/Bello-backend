import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NestEventBusAdapter } from './infrastructure/bus/nest-event-bus.adapter.js';
import { EVENT_BUS_TOKEN } from './application/ports/event-bus.interface.js';

@Global()
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: EVENT_BUS_TOKEN,
      useClass: NestEventBusAdapter,
    },
  ],
  exports: [EVENT_BUS_TOKEN, CqrsModule],
})
export class SharedModule {}
