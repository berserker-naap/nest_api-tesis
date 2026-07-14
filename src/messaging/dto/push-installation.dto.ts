import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PushPlatform } from '../enums/push-platform.enum';

export class UpsertPushInstallationDto {
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  pushChannel!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  enableDefaultTemplate?: boolean;

  @IsOptional()
  @IsObject()
  templates?: Record<
    string,
    {
      body: string;
      headers?: Record<string, string>;
      tags?: string[];
      expiry?: string;
    }
  >;
}

export class PushInstallationResponseDto {
  installationId!: string;
  platform!: PushPlatform;
  pushChannel!: string;
  tags!: string[];
  // Legacy response field kept for compatibility with existing clients.
  azureUserId!: string;
  hasDefaultTemplate!: boolean;
  lastSyncAt!: Date | null;
  lastError!: string | null;
}
