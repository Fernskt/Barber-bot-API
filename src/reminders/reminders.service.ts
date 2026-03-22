import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppointmentsService } from '../appointments/appointments.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { BusinessConfigService } from '../business-config/business-config.service';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly whatsappService: WhatsAppService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  @Cron('*/5 * * * *')
  async handleReminders() {
    await this.send24hReminders();
    await this.send2hReminders();
  }

  private async send24hReminders() {
    const now = new Date();

    const from = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 5 * 60 * 1000);

    const appointments =
      await this.appointmentsService.findAppointmentsFor24hReminder(from, to);

    for (const appointment of appointments) {
      const date = appointment.startsAt.toISOString().slice(0, 10);
      const time = appointment.startsAt.toISOString().slice(11, 16);

      try {
        const config =
          (await this.businessConfigService.getConfig()) ||
          (await this.businessConfigService.createDefaultConfig());
        await this.whatsappService.sendText(
          appointment.customer.phone,
          `⏰ *Recordatorio de turno*

Hola ${appointment.customer.name || ''},
te recordamos tu turno para mañana.

*Servicio:* ${appointment.service.name}
*Barbero:* ${appointment.staff.name}
*Fecha:* ${date}
*Horario:* ${time}

Te esperamos en *${config.businessName}* 💈`,
        );

        await this.appointmentsService.mark24hReminderSent(appointment.id);
        this.logger.log(`24h reminder sent: ${appointment.id}`);
      } catch (error) {
        this.logger.error(
          `Error sending 24h reminder for ${appointment.id}`,
          error,
        );
      }
    }
  }

  private async send2hReminders() {
    const now = new Date();

    const from = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 5 * 60 * 1000);

    const appointments =
      await this.appointmentsService.findAppointmentsFor2hReminder(from, to);

    for (const appointment of appointments) {
      const date = appointment.startsAt.toISOString().slice(0, 10);
      const time = appointment.startsAt.toISOString().slice(11, 16);

      try {
        const config =
          (await this.businessConfigService.getConfig()) ||
          (await this.businessConfigService.createDefaultConfig());
        await this.whatsappService.sendText(
          appointment.customer.phone,
          `🔔 *Tu turno es en 2 horas*

Hola ${appointment.customer.name || ''},
te recordamos que tu turno se acerca.

*Servicio:* ${appointment.service.name}
*Barbero:* ${appointment.staff.name}
*Fecha:* ${date}
*Horario:* ${time}

¡Te esperamos en *${config.businessName}* 💈`,
        );

        await this.appointmentsService.mark2hReminderSent(appointment.id);
        this.logger.log(`2h reminder sent: ${appointment.id}`);
      } catch (error) {
        this.logger.error(
          `Error sending 2h reminder for ${appointment.id}`,
          error,
        );
      }
    }
  }
}
