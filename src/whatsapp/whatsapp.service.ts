import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { normalizeWhatsAppNumber } from '../common/utils/phone.util';

type ReplyButton = {
  id: string;
  title: string;
};

type ListRow = {
  id: string;
  title: string;
  description?: string;
};

@Injectable()
export class WhatsAppService {
  private get url() {
    return `https://graph.facebook.com/v23.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  async sendText(to: string, body: string) {
    const normalizedTo = normalizeWhatsAppNumber(to);

    await axios.post(
      this.url,
      {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: { body },
      },
      {
        headers: this.headers,
      },
    );
  }

  async sendReplyButtons(
    to: string,
    body: string,
    buttons: ReplyButton[],
    options?: {
      headerText?: string;
      footerText?: string;
    },
  ) {
    const normalizedTo = normalizeWhatsAppNumber(to);

    await axios.post(
      this.url,
      {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: options?.headerText
            ? {
                type: 'text',
                text: options.headerText,
              }
            : undefined,
          body: {
            text: body,
          },
          footer: options?.footerText
            ? {
                text: options.footerText,
              }
            : undefined,
          action: {
            buttons: buttons.slice(0, 3).map((button) => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title,
              },
            })),
          },
        },
      },
      {
        headers: this.headers,
      },
    );
  }

  async sendListMessage(
    to: string,
    body: string,
    buttonText: string,
    rows: ListRow[],
    options?: {
      headerText?: string;
      footerText?: string;
      sectionTitle?: string;
    },
  ) {
    const normalizedTo = normalizeWhatsAppNumber(to);

    await axios.post(
      this.url,
      {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: options?.headerText
            ? {
                type: 'text',
                text: options.headerText,
              }
            : undefined,
          body: {
            text: body,
          },
          footer: options?.footerText
            ? {
                text: options.footerText,
              }
            : undefined,
          action: {
            button: buttonText,
            sections: [
              {
                title: options?.sectionTitle || 'Opciones',
                rows: rows.slice(0, 10).map((row) => ({
                  id: row.id,
                  title: row.title,
                  description: row.description,
                })),
              },
            ],
          },
        },
      },
      {
        headers: this.headers,
      },
    );
  }

  extractMessageText(message: any): string {
    if (message?.type === 'text') {
      return message.text?.body?.trim().toLowerCase() || '';
    }

    if (message?.type === 'interactive') {
      const buttonReplyId = message.interactive?.button_reply?.id;
      const listReplyId = message.interactive?.list_reply?.id;

      return (buttonReplyId || listReplyId || '').trim().toLowerCase();
    }

    return '';
  }
}
