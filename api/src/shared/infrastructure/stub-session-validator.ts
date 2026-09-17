import { Injectable } from '@nestjs/common';
import { ISessionValidator } from '../application/ports/session-validator.interface.js';

@Injectable()
export class StubSessionValidator implements ISessionValidator {
  async validateToken(token: string): Promise<string | null> {
    // Stub: Retorna um UUID de contaId apenas se o token for "mock-token"
    if (token === 'mock-token') {
      return '123e4567-e89b-12d3-a456-426614174000';
    }
    return null;
  }
}
