import { Controller, Get, Patch, Body } from '@nestjs/common';
import { BusinessConfigService } from './business-config.service';
import { UpdateBusinessConfigDto } from './dto/update-business-config.dto';

@Controller('business-config')
export class BusinessConfigController {
  constructor(private readonly service: BusinessConfigService) {}

  @Get()
  async getConfig() {
    return this.service.ensureDefaults();
  }

  @Patch()
  async update(@Body() dto: UpdateBusinessConfigDto) {
    return this.service.updateConfig(dto);
  }
}
