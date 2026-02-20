import { Injectable } from '@nestjs/common';

@Injectable()
export class AssistantResponsePolicyService {
  private readonly maxChars = Number(process.env.ASSISTANT_MAX_RESPONSE_CHARS ?? 2200);
  private readonly blockedWords = [
    'raza superior',
    'odio',
    'discrimin',
    'violencia',
  ];

  enforce(rawContent: string): { content: string; adjusted: boolean; reason: string | null } {
    const content = (rawContent ?? '').trim();
    if (!content) {
      return {
        content: 'No pude generar una recomendacion valida. Intenta reformular tu consulta financiera.',
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

    if (content.length <= this.maxChars) {
      return { content, adjusted: false, reason: null };
    }

    return {
      content: `${content.slice(0, this.maxChars).trim()}...`,
      adjusted: true,
      reason: 'max_length',
    };
  }
}
