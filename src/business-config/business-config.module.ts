import { Module } from '@nestjs/common';
import { BusinessConfigService } from './business-config.service';

@Module({
  providers: [BusinessConfigService],
  exports: [BusinessConfigService],
})
export class BusinessConfigModule {}
