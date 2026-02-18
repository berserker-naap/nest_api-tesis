import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TestSendTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  to!: string;

  @IsString()
  @IsOptional()
  @MaxLength(128)
  templateName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(35)
  languageCode?: string;
}
