import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  MESSAGING_EMAIL_TEMPLATES,
  MessagingEmailTemplateCode,
} from '../constants/messaging-email-template.constants';

export class SendEmailDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsString()
  @MaxLength(180)
  subject!: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  plainText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(25000)
  html?: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}

export class SendTemplateEmailDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsString()
  @IsIn(MESSAGING_EMAIL_TEMPLATES)
  templateCode!: MessagingEmailTemplateCode;

  @IsOptional()
  @IsEmail()
  replyTo?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;
}

export class MessagingEmailSendResponseDto {
  provider!: string;
  providerMessageId!: string | null;
  status!: string;
  subject!: string;
  recipients!: string[];
  originalRecipients!: string[];
  testMode!: boolean;
  templateCode?: MessagingEmailTemplateCode | null;
}

