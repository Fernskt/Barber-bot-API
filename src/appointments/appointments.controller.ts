import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { FindAppointmentsByDateDto } from './dto/find-appointments-by-date.dto';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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
    return this.appointmentsService.cancelAppointment(id);
  }
}
