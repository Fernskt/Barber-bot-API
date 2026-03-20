import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(data: {
    customerId: string;
    serviceId: string;
    staffId: string;
    startsAt: Date;
  }) {
    return this.prisma.appointment.create({
      data: {
        customerId: data.customerId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        startsAt: data.startsAt,
        status: 'confirmed',
      },
    });
  }

  async findByStartsAtAndStaff(startsAt: Date, staffId: string) {
    return this.prisma.appointment.findFirst({
      where: {
        startsAt,
        staffId,
        status: 'confirmed',
      },
    });
  }

  async findByDateAndStaff(date: string, staffId: string) {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    return this.prisma.appointment.findMany({
      where: {
        staffId,
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: 'confirmed',
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async findNextAppointmentByCustomerPhone(phone: string) {
    return this.prisma.appointment.findFirst({
      where: {
        customer: {
          phone,
        },
        status: 'confirmed',
        startsAt: {
          gte: new Date(),
        },
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async updateAppointmentDateTime(appointmentId: string, startsAt: Date) {
    return this.prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        startsAt,
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });
  }

  async findById(appointmentId: string) {
    return this.prisma.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        service: true,
        staff: true,
        customer: true,
      },
    });
  }

  async cancelAppointment(appointmentId: string) {
    return this.prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: 'cancelled',
      },
    });
  }
}
