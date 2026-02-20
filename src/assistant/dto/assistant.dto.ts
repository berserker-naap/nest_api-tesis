import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssistantSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  titulo?: string;
}

export class AssistantChatDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1200)
  message!: string;
}

export class AssistantListSessionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class AssistantListMessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export interface AssistantSessionItemDto {
  id: number;
  titulo: string;
  proveedor: string;
  modelo: string;
  cantidadMensajes: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostoUsd: number;
  ultimoMensajeEn: Date;
}

export interface AssistantMessageItemDto {
  id: number;
  rol: 'USER' | 'ASSISTANT' | 'SYSTEM';
  contenido: string;
  fueraDeDominio: boolean;
  herramienta: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costoUsd: number | null;
  latenciaMs: number | null;
  fechaRegistro: Date;
}

export interface AssistantChatResultDto {
  session: AssistantSessionItemDto;
  assistantMessage: AssistantMessageItemDto;
  toolContext: {
    toolsUsed: string[];
    contextTokenApprox: number;
  };
}
