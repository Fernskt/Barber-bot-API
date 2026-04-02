import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const [staff, ratings] = await Promise.all([
      this.prisma.staff.findMany({ orderBy: { createdAt: 'asc' } }),
      this.prisma.appointment.groupBy({
        by: ['staffId'],
        where: { rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return staff.map((s) => {
      const r = ratings.find((r) => r.staffId === s.id);
      return {
        ...s,
        avgRating: r?._avg.rating ?? null,
        totalRatings: r?._count.rating ?? 0,
      };
    });
  }

  async findAllActive() {
    return this.prisma.staff.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException('Barbero no encontrado');
    }

    return staff;
  }

  async create(dto: CreateStaffDto) {
    return this.prisma.staff.create({
      data: {
        name: dto.name,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.findById(id);

    return this.prisma.staff.update({
      where: { id },
      data: dto,
    });
  }

  async toggleActive(id: string) {
    const staff = await this.findById(id);

    return this.prisma.staff.update({
      where: { id },
      data: {
        active: !staff.active,
      },
    });
  }
}
