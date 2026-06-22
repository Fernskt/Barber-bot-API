import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerNotesDto } from './dto/update-customer-notes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id/notes')
  updateNotes(
    @Param('id') id: string,
    @Body() updateCustomerNotesDto: UpdateCustomerNotesDto,
  ) {
    return this.customersService.updateNotes(id, updateCustomerNotesDto.notes);
  }
}
