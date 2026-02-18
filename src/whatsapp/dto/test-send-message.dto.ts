import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class TestSendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  to!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  message!: string;
}
