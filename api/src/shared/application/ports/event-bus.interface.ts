import { DomainEvent } from '../../domain/events/domain.event.js';

export const EVENT_BUS_TOKEN = Symbol('EVENT_BUS_TOKEN');

/**
 * Porta de saída (Outbound Port) da camada de Application.
 * Inverte a dependência: os módulos não precisam saber que usam @nestjs/cqrs ou BullMQ,
 * apenas injetam esta interface para disparar eventos.
 */
export interface IEventBus {
  /**
   * Publica um único evento no barramento.
   */
  publish(event: DomainEvent): Promise<void>;
  
  /**
   * Publica um array de eventos no barramento.
   */
  publishAll(events: DomainEvent[]): Promise<void>;
}
