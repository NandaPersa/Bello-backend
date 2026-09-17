import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';
import { CurrentAccount } from './decorators/current-account.decorator.js';
import { AuthGuard } from './guards/auth.guard.js';

@Controller('poc')
@UseGuards(AuthGuard)
export class PocController {
  
  @Get('publico')
  @Public()
  rotaPublica() {
    return { message: 'Acesso liberado sem token' };
  }

  @Get('privado')
  rotaPrivada(@CurrentAccount() contaId: string) {
    return { 
      message: 'Acesso restrito', 
      contaId 
    };
  }
}
