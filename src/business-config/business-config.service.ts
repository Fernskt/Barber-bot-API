import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WEEKDAY_ORDER } from '../common/constants/weekdays';

@Injectable()
export class BusinessConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    return this.prisma.businessConfig.findFirst();
  }

  async createDefaultConfig() {
    const existing = await this.getConfig();

    if (existing) return existing;

    return this.prisma.businessConfig.create({
      data: {
        businessName: 'BarberShop',
        welcomeMessage: '¿En qué puedo ayudarte?',
        address: 'Av. Siempre Viva 123',
        phone: '541100000000',
        bookingWindowDays: 30,
        openingHours: {
          monday: '10:00-19:00',
          tuesday: '10:00-19:00',
          wednesday: '10:00-19:00',
          thursday: '10:00-19:00',
          friday: '10:00-19:00',
          saturday: '10:00-14:00',
        },
        closedDays: ['sunday'],
        bookingSlots: {
          monday: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
          tuesday: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
          wednesday: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
          thursday: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
          friday: ['10:00', '11:00', '12:00', '16:00', '17:00', '18:00'],
          saturday: ['10:00', '11:00', '12:00'],
        },
      },
    });
  }

  normalizeOpeningHours(openingHours: unknown): Record<string, string> {
    if (!openingHours || typeof openingHours !== 'object' || Array.isArray(openingHours)) {
      return {};
    }

    const hours = openingHours as Record<string, string>;
    const ordered: Record<string, string> = {};

    for (const day of WEEKDAY_ORDER) {
      if (hours[day]) {
        ordered[day] = hours[day];
      }
    }

    return ordered;
  }

  normalizeClosedDays(closedDays: unknown): string[] {
    if (!Array.isArray(closedDays)) return [];

    const normalized = closedDays.map(String);

    return WEEKDAY_ORDER.filter((day) => normalized.includes(day));
  }

  normalizeBookingSlots(bookingSlots: unknown): Record<string, string[]> {
    if (!bookingSlots || typeof bookingSlots !== 'object' || Array.isArray(bookingSlots)) {
      return {};
    }

    const slots = bookingSlots as Record<string, string[]>;
    const ordered: Record<string, string[]> = {};

    for (const day of WEEKDAY_ORDER) {
      if (Array.isArray(slots[day])) {
        ordered[day] = slots[day];
      }
    }

    return ordered;
  }
}
