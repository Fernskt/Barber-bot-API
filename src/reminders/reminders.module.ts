import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [AppointmentsModule, WhatsAppModule],
  providers: [RemindersService],
})
export class RemindersModule {}
