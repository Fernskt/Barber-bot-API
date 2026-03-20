import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
