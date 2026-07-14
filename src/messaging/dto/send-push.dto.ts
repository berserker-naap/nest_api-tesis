import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PushPlatform } from '../enums/push-platform.enum';

export class SendTemplatePushDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  installationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagExpression?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deepLink?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;
}

export class SendNativePushDto {
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  installationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagExpression?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deepLink?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  badge?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sound?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string | number | boolean | null>;
}

export class PushDispatchResponseDto {
  provider!: string;
  providerMessageId!: string | null;
  status!: string;
  format!: string;
  platform!: PushPlatform | 'TEMPLATE';
  targetExpression!: string;
  title!: string | null;
  message!: string | null;
  testMode!: boolean;
}

