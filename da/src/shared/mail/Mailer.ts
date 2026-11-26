export interface MailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP is not configured");
    this.name = "MailNotConfiguredError";
  }
}

export class MailDeliveryError extends Error {
  constructor(cause: unknown) {
    super("Email delivery failed", { cause });
    this.name = "MailDeliveryError";
  }
}

export const unconfiguredMailer: Mailer = {
  send() {
    return Promise.reject(new MailNotConfiguredError());
  },
};
