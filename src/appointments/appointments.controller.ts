import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { FindAppointmentsByDateDto } from './dto/find-appointments-by-date.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Get()
  async findAll() {
    return this.appointmentsService.findAll();
  }

  @Get('by-date')
  async findByDate(@Query() query: FindAppointmentsByDateDto) {
    return this.appointmentsService.findByDate(query.date);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.appointmentsService.findById(id);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    const appointment = await this.appointmentsService.findById(id);
    const cancelled = await this.appointmentsService.cancelAppointment(id);

    const date = appointment.startsAt.toISOString().slice(0, 10);
    const time = appointment.startsAt.toISOString().slice(11, 16);

    // Notificar lista de espera en segundo plano
    void this.waitlistService.checkAndNotifyForSlot(date, time, appointment.staffId);

    return cancelled;
  }
}
