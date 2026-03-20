import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { normalizeWhatsAppNumber } from '../common/utils/phone.util';

@Injectable()
export class WhatsAppService {
  async sendText(to: string, body: string) {
    const normalizedTo = normalizeWhatsAppNumber(to);
    const url = `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
