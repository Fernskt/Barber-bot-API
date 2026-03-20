import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ServicesModule } from '../services/services.module';
import { ConversationStateModule } from '../conversation-state/conversation-state.module';
import { CustomersModule } from '../customers/customers.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [
    WhatsAppModule,
    ServicesModule,
    ConversationStateModule,
    CustomersModule,
    AppointmentsModule,
    StaffModule,
  ],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
