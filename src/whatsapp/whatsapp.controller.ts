import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from '../bot/bot.service';

@Controller('webhook')
export class WhatsAppController {
  constructor(private readonly botService: BotService) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  }

  @Post()
  async receiveMessage(@Req() req: Request, @Res() res: Response) {
    await this.botService.handleIncoming(req.body);
    return res.sendStatus(200);
  }
}
