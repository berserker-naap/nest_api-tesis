export const AssistantMessageRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  SYSTEM: 'SYSTEM',
} as const;

export type AssistantMessageRole =
  (typeof AssistantMessageRole)[keyof typeof AssistantMessageRole];

export const AssistantSessionStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type AssistantSessionStatus =
  (typeof AssistantSessionStatus)[keyof typeof AssistantSessionStatus];
