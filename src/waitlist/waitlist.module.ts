import { Module } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ConversationStateModule } from '../conversation-state/conversation-state.module';
import { BusinessConfigModule } from '../business-config/business-config.module';

@Module({
  imports: [WhatsAppModule, ConversationStateModule, BusinessConfigModule],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
