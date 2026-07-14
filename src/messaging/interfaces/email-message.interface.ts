export type EmailAddress = {
  address: string;
  displayName?: string | null;
};

export type EmailMessagePayload = {
  from: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject: string;
  plainText?: string | null;
  html?: string | null;
};

export type EmailDispatchResult = {
  provider: string;
  providerMessageId: string | null;
  status: string;
  raw?: unknown;
};

export interface EmailSenderProvider {
  send(message: EmailMessagePayload): Promise<EmailDispatchResult>;
}

