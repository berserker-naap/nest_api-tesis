export const MESSAGING_EMAIL_TEMPLATES = [
  'WELCOME',
  'PASSWORD_RESET',
  'GENERIC_NOTIFICATION',
] as const;

export type MessagingEmailTemplateCode =
  (typeof MESSAGING_EMAIL_TEMPLATES)[number];

