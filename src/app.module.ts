import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { BotModule } from './bot/bot.module';
import { WhatsAppController } from './whatsapp/whatsapp.controller';
import { ServicesModule } from './services/services.module';
import { ConversationStateModule } from './conversation-state/conversation-state.module';
import { CustomersModule } from './customers/customers.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    BotModule,
    ServicesModule,
    ConversationStateModule,
    CustomersModule,
    AppointmentsModule,
    StaffModule,
  ],
  controllers: [WhatsAppController],
})
export class AppModule {}
