import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive() {
    return this.prisma.staff.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
