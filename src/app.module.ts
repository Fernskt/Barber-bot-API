import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { BotModule } from './bot/bot.module';
import { WhatsAppController } from './whatsapp/whatsapp.controller';

@Module({
  imports: [PrismaModule, WhatsAppModule, BotModule],
  controllers: [WhatsAppController],
})
export class AppModule {}
