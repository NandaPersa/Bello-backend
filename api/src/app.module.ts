import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [SharedModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
