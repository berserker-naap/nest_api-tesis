import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MessagingCampaignScope } from '../enums/messaging-campaign-scope.enum';
import { MessagingCampaignStatus } from '../enums/messaging-campaign-status.enum';

export class CreateMessagingCampaignDto {
  @IsOptional()
  @IsEnum(MessagingCampaignScope)
  scope?: MessagingCampaignScope;

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
  @IsBoolean()
  sendPush?: boolean;

  @IsOptional()
  @IsBoolean()
  publishInApp?: boolean;
}

export class UpdateMessagingCampaignDto extends PartialType(
  CreateMessagingCampaignDto,
) {}

export class MessagingCampaignResponseDto {
  id!: number;
  scope!: MessagingCampaignScope;
  title!: string;
  message!: string;
  deepLink!: string | null;
  sendPush!: boolean;
  publishInApp!: boolean;
  status!: MessagingCampaignStatus;
  sentAt!: Date | null;
  pushStatus!: string | null;
  pushProviderMessageId!: string | null;
  createdAt!: Date;
  createdBy!: string | null;
  updatedAt!: Date | null;
  updatedBy!: string | null;
}

export class MessagingCampaignInboxItemDto {
  id!: number;
  title!: string;
  message!: string;
  deepLink!: string | null;
  sentAt!: Date | null;
  readAt!: Date | null;
  isRead!: boolean;
}

export class MessagingCampaignUnreadCountDto {
  unreadCount!: number;
}
