import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.customer.findUnique({
      where: { phone },
    });
  }

  async findOrCreate(phone: string, name?: string) {
    const existing = await this.findByPhone(phone);

    if (existing) {
      if (name && existing.name !== name) {
        return this.prisma.customer.update({
          where: { phone },
          data: { name },
        });
      }

      return existing;
    }

    return this.prisma.customer.create({
      data: {
        phone,
        name,
      },
    });
  }
}
