import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationStateService } from '../conversation-state/conversation-state.service';
import { BusinessConfigService } from '../business-config/business-config.service';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppService,
    private readonly conversationStateService: ConversationStateService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  async addToWaitlist(
    customerId: string,
    serviceId: string,
    staffId: string | null,
    requestedDate: string,
  ) {
    // Evitar duplicados: no agregar si ya hay una entrada WAITING para la misma combinación
    const existing = await this.prisma.waitlist.findFirst({
      where: {
        customerId,
        requestedDate,
        staffId: staffId ?? null,
        status: 'WAITING',
      },
    });

    if (existing) return existing;

    return this.prisma.waitlist.create({
      data: {
        customerId,
        serviceId,
        staffId: staffId ?? null,
        requestedDate,
        status: 'WAITING',
      },
    });
  }

  async checkAndNotifyForSlot(date: string, time: string, staffId: string) {
    // Buscar la entrada más antigua en lista de espera para ese día y ese barbero
    const entry = await this.prisma.waitlist.findFirst({
      where: {
        requestedDate: date,
        status: 'WAITING',
        OR: [{ staffId }, { staffId: null }],
      },
      include: { customer: true, service: true, staff: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!entry) return;

    const config =
      (await this.businessConfigService.getConfig()) ||
      (await this.businessConfigService.createDefaultConfig());

    try {
      await this.whatsappService.sendReplyButtons(
        entry.customer.phone,
        `Hola ${entry.customer.name || ''}! Se liberó un turno en *${config.businessName}* 💈

📅 *Fecha:* ${date}
⏰ *Horario:* ${time}
✂️ *Servicio:* ${entry.service.name}
💇 *Barbero:* ${entry.staff?.name ?? 'A confirmar'}

¿Querés reservarlo? ¡Respondé rápido, el lugar puede ocuparse!`,
        [
          { id: 'waitlist_confirm_yes', title: '✅ Sí, reservar' },
          { id: 'waitlist_confirm_no', title: '❌ No, gracias' },
        ],
        { headerText: '🔔 ¡Turno disponible!', footerText: 'Lista de espera' },
      );

      await this.prisma.waitlist.update({
        where: { id: entry.id },
        data: {
          status: 'NOTIFIED',
          offeredDate: date,
          offeredTime: time,
          notifiedAt: new Date(),
        },
      });

      await this.conversationStateService.setState(
        entry.customer.phone,
        'WAITLIST_OFFER',
        {
          waitlistId: entry.id,
          customerId: entry.customerId,
          serviceId: entry.serviceId,
          serviceName: entry.service.name,
          staffId: staffId,
          staffName: entry.staff?.name ?? '',
          customerName: entry.customer.name ?? '',
          offeredDate: date,
          offeredTime: time,
        },
      );

      this.logger.log(
        `Waitlist notification sent: entry=${entry.id} slot=${date} ${time}`,
      );
    } catch (error) {
      this.logger.error(`Error notifying waitlist entry ${entry.id}`, error);
    }
  }

  async expireEntry(waitlistId: string) {
    return this.prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'EXPIRED' },
    });
  }

  async markBooked(waitlistId: string) {
    return this.prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'BOOKED' },
    });
  }
}
