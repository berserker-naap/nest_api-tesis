import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StatusResponse } from 'src/common/dto/response.dto';
import { Usuario } from 'src/security/entities/usuario.entity';
import { Repository } from 'typeorm';
import {
  AssistantChatDto,
  AssistantChatResultDto,
  AssistantListMessagesQueryDto,
  AssistantListSessionsQueryDto,
  AssistantMessageItemDto,
  AssistantSessionItemDto,
  CreateAssistantSessionDto,
} from '../dto/assistant.dto';
import { AssistantMessageRole, AssistantSessionStatus } from '../enum/assistant.enum';
import { AssistantMessage } from '../entities/assistant-message.entity';
import { AssistantSession } from '../entities/assistant-session.entity';
import { GeminiProvider } from '../providers/gemini.provider';
import { AssistantCostService } from './assistant-cost.service';
import { AssistantDomainGuardService } from './assistant-domain-guard.service';
import { AssistantFinanceToolsService } from './assistant-finance-tools.service';
import { AssistantResponsePolicyService } from './assistant-response-policy.service';

@Injectable()
export class AssistantChatService {
  private readonly historyLimit = this.toBoundedNumber(
    process.env.ASSISTANT_HISTORY_LIMIT,
    8,
    2,
    30,
  );
  private readonly historyMessageMaxChars = this.toBoundedNumber(
    process.env.ASSISTANT_HISTORY_MESSAGE_MAX_CHARS,
    500,
    180,
    1200,
  );
  private readonly messageListDefaultLimit = this.toBoundedNumber(
    process.env.ASSISTANT_MESSAGES_DEFAULT_LIMIT,
    60,
    10,
    200,
  );
  private readonly toolPayloadMaxChars = this.toBoundedNumber(
    process.env.ASSISTANT_TOOL_PAYLOAD_MAX_CHARS,
    6500,
    1000,
    25000,
  );

  constructor(
    @InjectRepository(AssistantSession)
    private readonly sessionRepository: Repository<AssistantSession>,
    @InjectRepository(AssistantMessage)
    private readonly messageRepository: Repository<AssistantMessage>,
    private readonly domainGuard: AssistantDomainGuardService,
    private readonly financeTools: AssistantFinanceToolsService,
    private readonly geminiProvider: GeminiProvider,
    private readonly costService: AssistantCostService,
    private readonly responsePolicy: AssistantResponsePolicyService,
  ) {}

  async createSession(
    dto: CreateAssistantSessionDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<AssistantSessionItemDto>> {
    const titulo =
      (dto.titulo ?? '').trim() ||
      `Asistente ${new Date().toLocaleDateString('es-PE')}`;

    const session = this.sessionRepository.create({
      usuario,
      titulo,
      proveedor: 'gemini',
      modelo: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
      estado: AssistantSessionStatus.ACTIVE,
      cantidadMensajes: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostoUsd: 0,
      ultimoMensajeEn: new Date(),
      usuarioRegistro: usuario.login,
      ipRegistro: ip,
    });

    const saved = await this.sessionRepository.save(session);
    return new StatusResponse(true, 201, 'Sesion creada', this.toSessionDto(saved));
  }

  async listSessions(
    query: AssistantListSessionsQueryDto,
    usuario: Usuario,
  ): Promise<StatusResponse<AssistantSessionItemDto[]>> {
    const limit = query.limit ?? 20;
    const sessions = await this.sessionRepository.find({
      where: {
        usuario: { id: usuario.id },
        activo: true,
        eliminado: false,
      },
      order: { ultimoMensajeEn: 'DESC', id: 'DESC' },
      take: limit,
      relations: ['usuario'],
    });

    return new StatusResponse(
      true,
      200,
      'Sesiones obtenidas',
      sessions.map((item) => this.toSessionDto(item)),
    );
  }

  async listMessages(
    sessionId: number,
    query: AssistantListMessagesQueryDto,
    usuario: Usuario,
  ): Promise<StatusResponse<AssistantMessageItemDto[]>> {
    const session = await this.findSessionOrThrow(sessionId, usuario.id);
    const limit = query.limit ?? this.messageListDefaultLimit;

    const messages = await this.messageRepository.find({
      where: {
        session: { id: session.id },
        usuario: { id: usuario.id },
        activo: true,
        eliminado: false,
      },
      order: { id: 'ASC' },
      take: limit,
      relations: ['session', 'usuario'],
    });

    return new StatusResponse(
      true,
      200,
      'Mensajes obtenidos',
      messages.map((item) => this.toMessageDto(item)),
    );
  }

  async chat(
    dto: AssistantChatDto,
    usuario: Usuario,
    ip: string,
  ): Promise<StatusResponse<AssistantChatResultDto>> {
    const session = dto.sessionId
      ? await this.findSessionOrThrow(dto.sessionId, usuario.id)
      : await this.createDefaultSession(usuario, ip);

    const userContent = dto.message.trim();
    await this.appendMessage({
      session,
      usuario,
      rol: AssistantMessageRole.USER,
      contenido: userContent,
      fueraDeDominio: false,
      herramienta: null,
      herramientaPayload: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      costoUsd: null,
      latenciaMs: null,
      ip,
    });

    const guard = this.domainGuard.evaluate(userContent);
    if (!guard.allowed) {
      const rejectionMessage = await this.appendMessage({
        session,
        usuario,
        rol: AssistantMessageRole.ASSISTANT,
        contenido: guard.safeReply,
        fueraDeDominio: true,
        herramienta: 'domain_guard',
        herramientaPayload: this.serializePayload({
          reason: guard.reason,
          flags: guard.flags ?? [],
        }),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costoUsd: 0,
        latenciaMs: 0,
        ip,
      });

      await this.updateSessionStats(
        session,
        {
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          messageIncrement: 2,
        },
        usuario.login,
        ip,
      );

      return new StatusResponse(true, 200, 'Respuesta generada', {
        session: this.toSessionDto(await this.reloadSession(session.id)),
        assistantMessage: this.toMessageDto(rejectionMessage),
        toolContext: {
          toolsUsed: ['domain_guard'],
          contextTokenApprox: 0,
        },
      });
    }

    const monthSpentUsd = await this.getCurrentMonthSpentUsd(usuario.id);
    if (this.costService.isMonthlyBudgetExceeded(monthSpentUsd)) {
      const budgetUsd = this.costService.getMonthlyBudgetUsd();
      const budgetMessage = await this.appendMessage({
        session,
        usuario,
        rol: AssistantMessageRole.ASSISTANT,
        contenido:
          `Se alcanzo el limite mensual del asistente (${budgetUsd.toFixed(2)} USD). ` +
          'Puedes seguir registrando transacciones y retomar el chat el siguiente mes.',
        fueraDeDominio: false,
        herramienta: 'budget_guard',
        herramientaPayload: this.serializePayload({
          monthSpentUsd,
          budgetUsd,
          month: new Date().toISOString().slice(0, 7),
        }),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costoUsd: 0,
        latenciaMs: 0,
        ip,
      });

      await this.updateSessionStats(
        session,
        {
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          messageIncrement: 2,
        },
        usuario.login,
        ip,
      );

      return new StatusResponse(true, 200, 'Respuesta generada', {
        session: this.toSessionDto(await this.reloadSession(session.id)),
        assistantMessage: this.toMessageDto(budgetMessage),
        toolContext: {
          toolsUsed: ['budget_guard'],
          contextTokenApprox: 0,
        },
      });
    }

    let toolsUsed: string[] = [];
    let financeContext: Record<string, unknown> = {};
    let contextTokenApprox = 0;

    try {
      const [history, toolContext] = await Promise.all([
        this.loadHistoryForModel(session.id, usuario.id),
        this.financeTools.buildContextForQuestion(usuario.id, userContent),
      ]);

      toolsUsed = toolContext.toolsUsed;
      financeContext = toolContext.context;
      contextTokenApprox = this.approxTokenCount(financeContext);

      const llmResult = await this.geminiProvider.generate({
        systemPrompt: this.buildSystemPrompt(),
        userMessage: userContent,
        history,
        financeContext,
      });

      const policy = this.responsePolicy.enforce(llmResult.content);
      if (policy.adjusted) {
        toolsUsed = [...toolsUsed, 'response_policy'];
      }

      const costUsd = this.costService.calculateCostUsd(
        llmResult.inputTokens,
        llmResult.outputTokens,
      );

      const assistantMessage = await this.appendMessage({
        session,
        usuario,
        rol: AssistantMessageRole.ASSISTANT,
        contenido: policy.content,
        fueraDeDominio: false,
        herramienta: toolsUsed.join(', '),
        herramientaPayload: this.serializePayload({
          context: financeContext,
          policy: policy.adjusted ? { reason: policy.reason } : null,
        }),
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        totalTokens: llmResult.totalTokens,
        costoUsd: costUsd,
        latenciaMs: llmResult.latencyMs,
        ip,
      });

      await this.updateSessionStats(
        session,
        {
          inputTokens: llmResult.inputTokens,
          outputTokens: llmResult.outputTokens,
          costUsd,
          messageIncrement: 2,
        },
        usuario.login,
        ip,
      );

      return new StatusResponse(true, 200, 'Respuesta generada', {
        session: this.toSessionDto(await this.reloadSession(session.id)),
        assistantMessage: this.toMessageDto(assistantMessage),
        toolContext: {
          toolsUsed,
          contextTokenApprox,
        },
      });
    } catch (error) {
      const fallbackContent =
        'No pude completar el analisis en este momento. ' +
        'Intenta nuevamente o haz una pregunta financiera mas especifica.';

      const fallbackMessage = await this.appendMessage({
        session,
        usuario,
        rol: AssistantMessageRole.ASSISTANT,
        contenido: fallbackContent,
        fueraDeDominio: false,
        herramienta: [...toolsUsed, 'fallback_error'].join(', '),
        herramientaPayload: this.serializePayload({
          context: financeContext,
          error: error instanceof Error ? error.message : 'unknown_error',
        }),
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costoUsd: 0,
        latenciaMs: 0,
        ip,
      });

      await this.updateSessionStats(
        session,
        {
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
          messageIncrement: 2,
        },
        usuario.login,
        ip,
      );

      return new StatusResponse(true, 200, 'Respuesta generada', {
        session: this.toSessionDto(await this.reloadSession(session.id)),
        assistantMessage: this.toMessageDto(fallbackMessage),
        toolContext: {
          toolsUsed: [...toolsUsed, 'fallback_error'],
          contextTokenApprox,
        },
      });
    }
  }

  private buildSystemPrompt(): string {
    return [
      'Eres Fintera Assistant, experto en finanzas personales del usuario autenticado.',
      'Reglas estrictas:',
      '1) Solo responder temas financieros personales del usuario.',
      '2) No inventar montos ni fechas. Si falta dato, dilo explicitamente.',
      '3) Basarte unicamente en el CONTEXTO FINANCIERO VALIDADO.',
      '4) Evitar sesgos de genero, etnia, religion, politica o estatus social.',
      '5) Evitar consejos medicos, legales o de inversion garantizada.',
      '6) Dar respuestas accionables, claras y breves.',
      '7) Si la consulta esta fuera de dominio financiero personal, rechazar de forma amable.',
    ].join('\n');
  }

  private async createDefaultSession(
    usuario: Usuario,
    ip: string,
  ): Promise<AssistantSession> {
    const session = this.sessionRepository.create({
      usuario,
      titulo: `Asistente ${new Date().toLocaleDateString('es-PE')}`,
      proveedor: 'gemini',
      modelo: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
      estado: AssistantSessionStatus.ACTIVE,
      cantidadMensajes: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostoUsd: 0,
      ultimoMensajeEn: new Date(),
      usuarioRegistro: usuario.login,
      ipRegistro: ip,
    });
    return this.sessionRepository.save(session);
  }

  private async loadHistoryForModel(
    sessionId: number,
    idUsuario: number,
  ): Promise<Array<{ role: 'USER' | 'ASSISTANT'; content: string }>> {
    const rows = await this.messageRepository.find({
      where: {
        session: { id: sessionId },
        usuario: { id: idUsuario },
        activo: true,
        eliminado: false,
      },
      order: { id: 'DESC' },
      take: this.historyLimit,
      relations: ['session', 'usuario'],
    });

    return rows
      .reverse()
      .filter(
        (
          item,
        ): item is AssistantMessage & {
          rol: typeof AssistantMessageRole.USER | typeof AssistantMessageRole.ASSISTANT;
        } => this.isHistoryRole(item.rol),
      )
      .map((item) => ({
        role: item.rol,
        content: this.trimToMax(item.contenido, this.historyMessageMaxChars),
      }));
  }

  private isHistoryRole(
    role: AssistantMessageRole,
  ): role is typeof AssistantMessageRole.USER | typeof AssistantMessageRole.ASSISTANT {
    return role === AssistantMessageRole.USER || role === AssistantMessageRole.ASSISTANT;
  }

  private async findSessionOrThrow(
    sessionId: number,
    idUsuario: number,
  ): Promise<AssistantSession> {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
        usuario: { id: idUsuario },
        activo: true,
        eliminado: false,
      },
      relations: ['usuario'],
    });

    if (!session) {
      throw new NotFoundException('Sesion de asistente no encontrada');
    }

    return session;
  }

  private async reloadSession(sessionId: number): Promise<AssistantSession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['usuario'],
    });

    if (!session) {
      throw new NotFoundException('Sesion no encontrada');
    }

    return session;
  }

  private async appendMessage(input: {
    session: AssistantSession;
    usuario: Usuario;
    rol: 'USER' | 'ASSISTANT' | 'SYSTEM';
    contenido: string;
    fueraDeDominio: boolean;
    herramienta: string | null;
    herramientaPayload: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    costoUsd: number | null;
    latenciaMs: number | null;
    ip: string;
  }): Promise<AssistantMessage> {
    const message = this.messageRepository.create({
      session: input.session,
      usuario: input.usuario,
      rol: input.rol,
      contenido: input.contenido,
      fueraDeDominio: input.fueraDeDominio,
      herramienta: input.herramienta,
      herramientaPayload: input.herramientaPayload,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.totalTokens,
      costoUsd: input.costoUsd,
      latenciaMs: input.latenciaMs,
      usuarioRegistro: input.usuario.login,
      ipRegistro: input.ip,
    });

    return this.messageRepository.save(message);
  }

  private async updateSessionStats(
    session: AssistantSession,
    usage: {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      messageIncrement: number;
    },
    usuarioModificacion: string,
    ip: string,
  ): Promise<void> {
    const fresh = await this.reloadSession(session.id);
    fresh.cantidadMensajes += Math.max(usage.messageIncrement, 0);
    fresh.totalInputTokens += usage.inputTokens;
    fresh.totalOutputTokens += usage.outputTokens;
    fresh.totalCostoUsd = Number(
      (Number(fresh.totalCostoUsd) + usage.costUsd).toFixed(8),
    );
    fresh.ultimoMensajeEn = new Date();
    fresh.usuarioModificacion = usuarioModificacion;
    fresh.ipModificacion = ip;
    fresh.fechaModificacion = new Date();
    await this.sessionRepository.save(fresh);
  }

  private toSessionDto(session: AssistantSession): AssistantSessionItemDto {
    return {
      id: session.id,
      titulo: session.titulo,
      proveedor: session.proveedor,
      modelo: session.modelo,
      cantidadMensajes: Number(session.cantidadMensajes ?? 0),
      totalInputTokens: Number(session.totalInputTokens ?? 0),
      totalOutputTokens: Number(session.totalOutputTokens ?? 0),
      totalCostoUsd: Number(session.totalCostoUsd ?? 0),
      ultimoMensajeEn: session.ultimoMensajeEn,
    };
  }

  private toMessageDto(message: AssistantMessage): AssistantMessageItemDto {
    return {
      id: message.id,
      rol: message.rol,
      contenido: message.contenido,
      fueraDeDominio: Boolean(message.fueraDeDominio),
      herramienta: message.herramienta,
      inputTokens: message.inputTokens,
      outputTokens: message.outputTokens,
      totalTokens: message.totalTokens,
      costoUsd:
        message.costoUsd !== null && message.costoUsd !== undefined
          ? Number(message.costoUsd)
          : null,
      latenciaMs: message.latenciaMs,
      fechaRegistro: message.fechaRegistro,
    };
  }

  private trimToMax(value: string, maxChars: number): string {
    if (!value || value.length <= maxChars) {
      return value;
    }
    return `${value.slice(0, maxChars).trim()}...`;
  }

  private serializePayload(data: unknown): string {
    const raw = JSON.stringify(data) ?? '{}';
    if (raw.length <= this.toolPayloadMaxChars) {
      return raw;
    }
    return `${raw.slice(0, this.toolPayloadMaxChars)}...`;
  }

  private approxTokenCount(value: unknown): number {
    const raw = JSON.stringify(value ?? {}) ?? '{}';
    return Math.ceil(raw.length / 4);
  }

  private toBoundedNumber(
    raw: string | undefined,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  private async getCurrentMonthSpentUsd(idUsuario: number): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const raw = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.usuario', 'usuario')
      .select('SUM(COALESCE(message.costoUsd, 0))', 'total')
      .where('usuario.id = :idUsuario', { idUsuario })
      .andWhere('message.activo = :activo', { activo: true })
      .andWhere('message.eliminado = :eliminado', { eliminado: false })
      .andWhere('message.fechaRegistro >= :monthStart', { monthStart })
      .andWhere('message.fechaRegistro < :nextMonthStart', { nextMonthStart })
      .getRawOne<{ total?: string | number | null }>();

    return Number(raw?.total ?? 0);
  }
}
