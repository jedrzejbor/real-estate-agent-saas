import { Body, Controller, Get, Post } from '@nestjs/common';
import { RenderMessageTemplateDto } from './dto/render-message-template.dto';
import { MessageTemplatesService } from './message-templates.service';

@Controller('message-templates')
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
  ) {}

  /** GET /api/message-templates — list available static message templates. */
  @Get()
  findAll() {
    return this.messageTemplatesService.findAll();
  }

  /** POST /api/message-templates/render — render a template preview for copy. */
  @Post('render')
  render(@Body() dto: RenderMessageTemplateDto) {
    return this.messageTemplatesService.render(dto.type, dto.context ?? {});
  }
}
