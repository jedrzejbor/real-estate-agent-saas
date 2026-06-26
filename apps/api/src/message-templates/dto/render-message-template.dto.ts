import { IsEnum, IsObject, IsOptional } from 'class-validator';
import {
  MessageTemplateContext,
  MessageTemplateType,
} from '../message-template.types';

export class RenderMessageTemplateDto {
  @IsEnum(MessageTemplateType)
  type: MessageTemplateType;

  @IsOptional()
  @IsObject()
  context?: MessageTemplateContext;
}
