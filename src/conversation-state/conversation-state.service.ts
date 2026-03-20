import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationStateService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(phone: string) {
    return this.prisma.conversationState.findUnique({
      where: { phone },
    });
  }

  async setState(phone: string, state: string, payload?: any) {
    return this.prisma.conversationState.upsert({
      where: { phone },
      update: { state, payload },
      create: { phone, state, payload },
    });
  }

  async clearState(phone: string) {
    return this.prisma.conversationState.deleteMany({
      where: { phone },
    });
  }
}
