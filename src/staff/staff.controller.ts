import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffAvailabilityService } from './staff-availability.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SetStaffAvailabilityDto } from './dto/set-staff-availability.dto';

@Controller('staff')
export class StaffController {
  constructor(
    private readonly staffService: StaffService,
    private readonly staffAvailabilityService: StaffAvailabilityService,
  ) {}

  @Get()
  async findAll() {
    return this.staffService.findAll();
  }

  @Get('active')
  async findAllActive() {
    return this.staffService.findAllActive();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.staffService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateStaffDto) {
    return this.staffService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.staffService.toggleActive(id);
  }

  @Get(':id/availability')
  async getAvailability(@Param('id') id: string) {
    return this.staffAvailabilityService.findByStaff(id);
  }

  @Put(':id/availability')
  async setAvailability(
    @Param('id') id: string,
    @Body() dto: SetStaffAvailabilityDto,
  ) {
    return this.staffAvailabilityService.setWeeklySchedule(id, dto.schedules);
  }
}
