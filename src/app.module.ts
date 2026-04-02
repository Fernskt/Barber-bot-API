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
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersModule } from './reminders/reminders.module';
import { BusinessConfigModule } from './business-config/business-config.module';
import { WaitlistModule } from './waitlist/waitlist.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    WhatsAppModule,
    BotModule,
    ServicesModule,
    ConversationStateModule,
    CustomersModule,
    AppointmentsModule,
    StaffModule,
    RemindersModule,
    BusinessConfigModule,
    WaitlistModule,
  ],
  controllers: [WhatsAppController],
})
export class AppModule {}
