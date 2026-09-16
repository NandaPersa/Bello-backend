import { randomUUID } from 'node:crypto';

/**
 * Base para todos os eventos de domínio do sistema.
 * Garante que todo evento terá um ID único, a data em que ocorreu e um correlationId
 * para rastreabilidade cross-módulo (ex: acompanhando logs desde o Scheduling até o Notifications).
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly correlationId?: string;

  constructor(correlationId?: string) {
    this.eventId = randomUUID();
    this.occurredOn = new Date();
    this.correlationId = correlationId;
  }

  /**
   * Nome canônico do evento para ser usado em logs e dead-letters.
   */
  abstract get eventName(): string;
}
