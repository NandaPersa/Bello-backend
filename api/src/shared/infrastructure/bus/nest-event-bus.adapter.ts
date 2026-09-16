import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { IEventBus } from '../../application/ports/event-bus.interface.js';
import { DomainEvent } from '../../domain/events/domain.event.js';

@Injectable()
export class NestEventBusAdapter implements IEventBus {
  constructor(private readonly cqrsEventBus: EventBus) {}

  async publish(event: DomainEvent): Promise<void> {
    this.cqrsEventBus.publish(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.cqrsEventBus.publishAll(events);
  }
}
