import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { BusinessConfigModule } from '../business-config/business-config.module';

@Module({
  imports: [AppointmentsModule, WhatsAppModule, BusinessConfigModule],
  providers: [RemindersService],
})
export class RemindersModule {}
