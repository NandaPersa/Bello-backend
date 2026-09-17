import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthGuard } from './auth.guard.js';
import { ISessionValidator } from '../../application/ports/session-validator.interface.js';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let reflector: Reflector;
  let sessionValidator: ISessionValidator;

  beforeEach(() => {
    reflector = new Reflector();
    sessionValidator = {
      validateToken: vi.fn(),
    };
    authGuard = new AuthGuard(reflector, sessionValidator);
  });

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request = { headers, user: undefined };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  };

  it('deve permitir acesso se a rota for publica (@Public)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();

    const result = await authGuard.canActivate(context);

    expect(result).toBe(true);
    expect(sessionValidator.validateToken).not.toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException se não houver token em rota privada', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext();

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(authGuard.canActivate(context)).rejects.toThrow('Token não fornecido');
  });

  it('deve lançar UnauthorizedException se o token for invalido', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    vi.spyOn(sessionValidator, 'validateToken').mockResolvedValue(null);
    const context = createMockContext({ authorization: 'Bearer token-invalido' });

    await expect(authGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(authGuard.canActivate(context)).rejects.toThrow('Sessão inválida ou expirada');
  });

  it('deve injetar contaId no request se o token for valido', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const mockContaId = '123e4567-e89b-12d3-a456-426614174000';
    vi.spyOn(sessionValidator, 'validateToken').mockResolvedValue(mockContaId);
    
    const context = createMockContext({ authorization: 'Bearer token-valido' });

    const result = await authGuard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({ contaId: mockContaId });
  });
});
