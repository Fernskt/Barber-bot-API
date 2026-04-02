import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { BusinessConfigModule } from '../business-config/business-config.module';
import { ConversationStateModule } from '../conversation-state/conversation-state.module';

@Module({
  imports: [AppointmentsModule, WhatsAppModule, BusinessConfigModule, ConversationStateModule],
  providers: [RemindersService],
})
export class RemindersModule {}
