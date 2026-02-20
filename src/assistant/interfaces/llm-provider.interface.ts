export interface LlmGenerateRequest {
  systemPrompt: string;
  userMessage: string;
  history: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>;
  financeContext: Record<string, unknown>;
}

export interface LlmGenerateResult {
  content: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
}

export interface LlmProvider {
  generate(request: LlmGenerateRequest): Promise<LlmGenerateResult>;
}
