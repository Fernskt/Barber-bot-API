import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string) {
    return this.prisma.customer.findUnique({
      where: { phone },
      include: {
        lastService: true,
        lastStaff: true,
      },
    });
  }

  async findOrCreate(phone: string, name?: string) {
    const existing = await this.findByPhone(phone);

    if (existing) {
      if (name && existing.name !== name) {
        return this.prisma.customer.update({
          where: { phone },
          data: { name },
          include: {
            lastService: true,
            lastStaff: true,
          },
        });
      }

      return existing;
    }

    return this.prisma.customer.create({
      data: {
        phone,
        name,
      },
      include: {
        lastService: true,
        lastStaff: true,
      },
    });
  }

  async findAll() {
    return this.prisma.customer.findMany({
      include: {
        lastService: true,
        lastStaff: true,
        appointments: {
          include: {
            service: true,
            staff: true,
          },
          orderBy: { startsAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        lastService: true,
        lastStaff: true,
        appointments: {
          include: {
            service: true,
            staff: true,
          },
          orderBy: { startsAt: 'desc' },
        },
      },
    });
  }

  async updateNotes(id: string, notes: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { notes },
    });
  }

  async updateLastService(
    customerId: string,
    serviceId: string,
    staffId: string,
  ) {
    try {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { lastServiceId: serviceId, lastStaffId: staffId },
      });
    } catch (error) {
      console.error('Error updating last service for customer:', error);
    }
  }
}
