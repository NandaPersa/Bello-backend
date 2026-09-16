import { EventsHandler } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DomainEvent } from '../../domain/events/domain.event.js';
import { EVENT_BUS_TOKEN, IEventBus } from '../../application/ports/event-bus.interface.js';
import { RetryableEventHandler } from './retryable-event-handler.js';
import { SharedModule } from '../../shared.module.js';

// --- STUBS E MOCKS PARA O TESTE ---

class DummyEvent extends DomainEvent {
  get eventName(): string {
    return 'DummyEvent.Criado';
  }
}

// Handler que sempre falha para testarmos o fluxo de retry e dead-letter
@EventsHandler(DummyEvent)
class FailingDummyHandler extends RetryableEventHandler<DummyEvent> {
  public attemptsMade = 0;

  // Sobrescrevendo o delay para 5ms (para o teste não demorar 14 segundos)
  protected getDelayMs(): number {
    return 5;
  }

  protected async handleEvent(_event: DummyEvent): Promise<void> {
    this.attemptsMade++;
    throw new Error('Falha proposital de banco ou API externa');
  }
}

// --- SUÍTE DE TESTES ---

describe('EventBus e Isolamento de Falhas (RetryableEventHandler)', () => {
  let eventBus: IEventBus;
  let handler: FailingDummyHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [FailingDummyHandler],
    }).compile();

    eventBus = module.get<IEventBus>(EVENT_BUS_TOKEN);
    handler = module.get<FailingDummyHandler>(FailingDummyHandler);

    // Inicializando o ciclo de vida do CQRS
    await module.init();
  });

  it('deve tentar processar 4 vezes (1 original + 3 retries) e falhar silenciosamente no Dead-Letter sem quebrar a Thread', async () => {
    // Espionamos o Logger original do NestJS para ver se as mensagens batem
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const evento = new DummyEvent('corr-id-1234');
    
    // O publish deve resolver instantaneamente (isolamento)
    const startTime = Date.now();
    await eventBus.publish(evento);
    const duration = Date.now() - startTime;
    
    // Prova 1: Publicar é super rápido, não bloqueou esperando retries ou falhas
    expect(duration).toBeLessThan(50); 

    // Aguarda um pouco para os retries assíncronos (setImmediate e setTimeout de 5ms) terminarem
    await new Promise(resolve => setTimeout(resolve, 100));

    // Prova 2: Tentou exatamente 4 vezes
    expect(handler.attemptsMade).toBe(4);

    // Prova 3: Logou os 3 warnings de retry
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(warnSpy.mock.calls[0][0]).toContain('Falha transitória ao processar evento DummyEvent.Criado. Tentativa 1/3');
    
    // Prova 4: Logou o Dead-Letter no final e com os IDs rastreáveis
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('[DEAD-LETTER] Falha final ao processar evento DummyEvent.Criado');
    expect(errorSpy.mock.calls[0][0]).toContain('corr-id-1234');
  });
});
