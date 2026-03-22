import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll() {
    return this.prisma.appointment.findMany({
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    return appointment;
  }

  async findByDate(date: string) {
    const startOfDay = new Date(`${date}T00:00:00`);
    const endOfDay = new Date(`${date}T23:59:59`);

    return this.prisma.appointment.findMany({
      where: {
        startsAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startsAt: 'asc',
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

  async cancelAppointment(appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    return this.prisma.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        status: 'cancelled',
      },
      include: {
        customer: true,
        service: true,
        staff: true,
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

  async findAppointmentsFor24hReminder(from: Date, to: Date) {
    return this.prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        reminder24hSentAt: null,
        startsAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async findAppointmentsFor2hReminder(from: Date, to: Date) {
    return this.prisma.appointment.findMany({
      where: {
        status: 'confirmed',
        reminder2hSentAt: null,
        startsAt: {
          gte: from,
          lte: to,
        },
      },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    });
  }

  async mark24hReminderSent(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        reminder24hSentAt: new Date(),
      },
    });
  }

  async mark2hReminderSent(appointmentId: string) {
    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        reminder2hSentAt: new Date(),
      },
    });
  }
}
