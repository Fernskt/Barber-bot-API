import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffAvailabilityDayDto } from './dto/set-staff-availability.dto';

@Injectable()
export class StaffAvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByStaff(staffId: string) {
    return this.prisma.staffAvailability.findMany({
      where: { staffId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setWeeklySchedule(staffId: string, schedules: StaffAvailabilityDayDto[]) {
    await this.prisma.staffAvailability.deleteMany({ where: { staffId } });

    if (schedules.length > 0) {
      await this.prisma.staffAvailability.createMany({
        data: schedules.map((s) => ({
          staffId,
          dayOfWeek: s.dayOfWeek,
          isAvailable: s.isAvailable,
          startTime: s.startTime ?? null,
          endTime: s.endTime ?? null,
        })),
      });
    }

    return this.findByStaff(staffId);
  }

  async getForDate(staffId: string, dateStr: string) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const dayOfWeek = localDate.getDay();

    return this.prisma.staffAvailability.findUnique({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    });
  }

  filterSlotsByHours(
    slots: string[],
    startTime: string | null,
    endTime: string | null,
  ): string[] {
    if (!startTime && !endTime) return slots;
    return slots.filter((slot) => {
      if (startTime && slot < startTime) return false;
      if (endTime && slot >= endTime) return false;
      return true;
    });
  }
}
