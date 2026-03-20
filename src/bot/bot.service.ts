import { Injectable } from '@nestjs/common';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class BotService {
  constructor(private readonly whatsappService: WhatsAppService) {}

  async handleIncoming(payload: any) {
    const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) return;

    const from = message.from;
    const text = message.text?.body?.trim().toLowerCase() || '';

    console.log('Incoming message:', text);
    console.log('FROM RAW:', from);

    if (text === 'hola' || text === 'menu') {
      await this.whatsappService.sendText(
        from,
        `💈 Bienvenido a Barber Bot

1. Reservar turno
2. Ver servicios
3. Horarios
4. Hablar con un barbero`,
      );
      return;
    }

    await this.whatsappService.sendText(
      from,
      'Escribí "hola" o "menu" para comenzar.',
    );
  }
}
