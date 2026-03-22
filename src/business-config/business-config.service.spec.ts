import { Test, TestingModule } from '@nestjs/testing';
import { BusinessConfigService } from './business-config.service';

describe('BusinessConfigService', () => {
  let service: BusinessConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessConfigService],
    }).compile();

    service = module.get<BusinessConfigService>(BusinessConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
