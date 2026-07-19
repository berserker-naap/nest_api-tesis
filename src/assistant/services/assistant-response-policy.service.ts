import { Injectable } from '@nestjs/common';

@Injectable()
export class AssistantResponsePolicyService {
  private readonly maxChars = Number(process.env.ASSISTANT_MAX_RESPONSE_CHARS ?? 2200);
  private readonly insufficientDataReply =
    'No encuentro datos suficientes en tus registros para responder eso con seguridad.';
  private readonly blockedWords = [
    'raza superior',
    'odio',
    'discrimin',
    'violencia',
  ];
  private readonly internalLeakTokens = [
    'system prompt',
    'prompt interno',
    'instrucciones internas',
    'developer message',
    'api key',
    'token',
    'gemini',
    'google ai studio',
    'backend',
    'sql',
    'typeorm',
  ];

  enforce(
    rawContent: string,
    input: {
      financeContext: Record<string, unknown>;
    },
  ): { content: string; adjusted: boolean; reason: string | null } {
    const content = (rawContent ?? '').trim();
    if (!content) {
      return {
        content: this.insufficientDataReply,
        adjusted: true,
        reason: 'empty_response',
      };
    }

    const normalized = content
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (this.blockedWords.some((token) => normalized.includes(token))) {
      return {
        content:
          'No puedo responder de esa forma. Si deseas, te ayudo con recomendaciones objetivas sobre tus finanzas personales.',
        adjusted: true,
        reason: 'safety_blocked_terms',
      };
    }

    if (this.internalLeakTokens.some((token) => normalized.includes(token))) {
      return {
        content: this.insufficientDataReply,
        adjusted: true,
        reason: 'internal_leak_blocked',
      };
    }

    const unsupportedNumbers = this.findUnsupportedNumbers(
      content,
      input.financeContext,
    );
    if (unsupportedNumbers.length > 0) {
      return {
        content: this.insufficientDataReply,
        adjusted: true,
        reason: 'unsupported_numeric_claim',
      };
    }

    if (content.length <= this.maxChars) {
      return { content, adjusted: false, reason: null };
    }

    return {
      content: `${content.slice(0, this.maxChars).trim()}...`,
      adjusted: true,
      reason: 'max_length',
    };
  }

  private findUnsupportedNumbers(
    content: string,
    financeContext: Record<string, unknown>,
  ): string[] {
    const responseNumbers = this.extractSignificantNumbers(content);
    if (responseNumbers.length === 0) {
      return [];
    }

    const contextNumbers = new Set(
      this.extractSignificantNumbers(JSON.stringify(financeContext ?? {})),
    );

    return responseNumbers.filter((token) => !contextNumbers.has(token));
  }

  private extractSignificantNumbers(value: string): string[] {
    const matches = value.match(/\b\d{2,}(?:[.,]\d+)?\b/g) ?? [];
    return Array.from(
      new Set(
        matches.map((item) => item.replace(/,/g, '.').replace(/\.0+$/, '')),
      ),
    );
  }
}
