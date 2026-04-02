import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerNotesDto } from './dto/update-customer-notes.dto';

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
