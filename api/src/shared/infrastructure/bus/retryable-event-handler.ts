import { IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { DomainEvent } from '../../domain/events/domain.event.js';

/**
 * Classe base para todos os listeners do sistema.
 * 
 * Intercepta o recebimento do evento e garante o Isolamento de Falhas:
 * 1. Processa a lógica de negócio de forma independente.
 * 2. Em caso de falha, retenta usando backoff exponencial até 3 vezes.
 * 3. Se falhar definitivamente, joga silenciosamente para o log de Dead-Letter,
 *    garantindo que o fluxo síncrono/transacional do publicador original não seja derrubado.
 */
export abstract class RetryableEventHandler<T extends DomainEvent> implements IEventHandler<T> {
  protected readonly logger = new Logger(this.constructor.name);
  private readonly maxRetries = 3;

  /**
   * Método que as classes filhas devem implementar com a regra real.
   */
  protected abstract handleEvent(event: T): Promise<void>;

  protected getDelayMs(attempt: number): number {
    return Math.pow(2, attempt) * 1000;
  }

  /**
   * Ponto de entrada do @nestjs/cqrs. Não sobrescrever nas filhas.
   */
  async handle(event: T): Promise<void> {
    // Para isolar 100% da transação atual, usamos setImmediate
    // Assim, se o publicador ainda estiver aguardando algo, ele é liberado.
    setImmediate(async () => {
      let attempt = 0;

      while (attempt <= this.maxRetries) {
        try {
          await this.handleEvent(event);
          return; // Sucesso, finaliza o wrapper.
        } catch (error) {
          attempt++;
          if (attempt > this.maxRetries) {
            // Log de Dead-Letter: a fila de retry in-memory estourou
            this.logger.error(
              `[DEAD-LETTER] Falha final ao processar evento ${event.eventName} [ID: ${event.eventId}]. CorrelationId: ${event.correlationId}`,
              error instanceof Error ? error.stack : error,
            );
            return;
          }

          const delayMs = this.getDelayMs(attempt);
          this.logger.warn(
            `Falha transitória ao processar evento ${event.eventName}. Tentativa ${attempt}/${this.maxRetries}. Aguardando ${delayMs}ms...`
          );
          
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    });
  }
}
