import { Injectable } from '@nestjs/common';
import { LlmProvider, LlmGenerateRequest, LlmGenerateResult } from '../interfaces/llm-provider.interface';

interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

@Injectable()
export class GeminiProvider implements LlmProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY ?? '';
  private readonly model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
  private readonly baseUrl = process.env.GEMINI_API_URL ?? 'https://generativelanguage.googleapis.com/v1beta';
  private readonly temperature = Number(process.env.GEMINI_TEMPERATURE ?? 0.2);
  private readonly maxOutputTokens = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 420);
  private readonly timeoutMs = this.toBoundedNumber(process.env.GEMINI_TIMEOUT_MS, 20000, 5000, 45000);
  private readonly maxContextChars = this.toBoundedNumber(
    process.env.ASSISTANT_MAX_CONTEXT_CHARS,
    9000,
    2000,
    24000,
  );

  async generate(request: LlmGenerateRequest): Promise<LlmGenerateResult> {
    const startedAt = Date.now();

    if (!this.apiKey) {
      const fallback =
        'No pude contactar al proveedor IA porque falta GEMINI_API_KEY en el backend. ' +
        'Configura la clave y vuelve a intentar.';
      return {
        content: fallback,
        provider: 'gemini',
        model: this.model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startedAt,
      };
    }

    const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const historyParts = request.history.map((item) => ({
      role: item.role === 'ASSISTANT' ? 'model' : 'user',
      parts: [{ text: item.content }],
    }));

    const financeContextCompact = JSON.stringify(request.financeContext) ?? '{}';
    const compactContext =
      financeContextCompact.length <= this.maxContextChars
        ? financeContextCompact
        : `${financeContextCompact.slice(0, this.maxContextChars)}...`;
    const contextPrompt =
      'CONTEXTO FINANCIERO VALIDADO (JSON, NO INVENTAR DATOS):\n' +
      compactContext;

    const payload = {
      systemInstruction: {
        parts: [{ text: request.systemPrompt }],
      },
      contents: [
        ...historyParts,
        {
          role: 'user',
          parts: [{ text: contextPrompt }],
        },
        {
          role: 'user',
          parts: [{ text: request.userMessage }],
        },
      ],
      generationConfig: {
        temperature: Number.isFinite(this.temperature) ? this.temperature : 0.2,
        maxOutputTokens: Number.isFinite(this.maxOutputTokens)
          ? this.maxOutputTokens
          : 420,
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini timeout luego de ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini error ${response.status}: ${text}`);
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: GeminiUsageMetadata;
    };

    const content =
      body.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim() ?? '';

    const usage = body.usageMetadata ?? {};
    const inputTokens = Number(usage.promptTokenCount ?? 0);
    const outputTokens = Number(usage.candidatesTokenCount ?? 0);
    const totalTokens = Number(usage.totalTokenCount ?? inputTokens + outputTokens);

    return {
      content: content || 'No se pudo generar una respuesta en este momento.',
      provider: 'gemini',
      model: this.model,
      inputTokens,
      outputTokens,
      totalTokens,
      latencyMs: Date.now() - startedAt,
    };
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
}
