import { Test, TestingModule } from '@nestjs/testing';
import { ConversationStateService } from './conversation-state.service';

describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationStateService],
    }).compile();

    service = module.get<ConversationStateService>(ConversationStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
