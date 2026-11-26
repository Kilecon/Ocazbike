import nodemailer from "nodemailer";
import {
  MailDeliveryError,
  type Mailer,
  type MailMessage,
  unconfiguredMailer,
} from "./Mailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  /** Only disabled for Mailpit's self-signed certificate (dev/release). */
  rejectUnauthorized: boolean;
  user?: string;
  password?: string;
  from: string;
}

type Environment = Record<string, string | undefined>;

/**
 * Same settings for every SMTP server: Gmail in production
 * (`smtp.gmail.com:465`, implicit TLS, application password) and Mailpit in
 * dev/release, which is configured the same way (implicit TLS + password)
 * except that its self-signed certificate cannot be verified.
 */
export function loadSmtpConfig(env: Environment): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  if (!host) return null;
  const secure = env.SMTP_SECURE?.trim().toLowerCase() === "true";
  const port = Number(env.SMTP_PORT?.trim() || (secure ? 465 : 587));
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port");
  }
  const rejectUnauthorized =
    env.SMTP_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false";
  const user = env.SMTP_USER?.trim() || undefined;
  const password = env.SMTP_PASSWORD || undefined;
  if (Boolean(user) !== Boolean(password)) {
    throw new Error("SMTP_USER and SMTP_PASSWORD must be set together");
  }
  const from = env.SMTP_FROM?.trim() || user;
  if (!from) {
    throw new Error("SMTP_FROM must be set when SMTP_USER is empty");
  }
  return { host, port, secure, rejectUnauthorized, user, password, from };
}

export class SmtpMailer implements Mailer {
  private readonly transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      tls: { rejectUnauthorized: config.rejectUnauthorized },
      auth: config.user
        ? { user: config.user, pass: config.password }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: MailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: message.to,
        replyTo: message.replyTo || undefined,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: Buffer.from(attachment.content),
          contentType: attachment.contentType,
        })),
      });
    } catch (error) {
      throw new MailDeliveryError(error);
    }
  }
}

export function createMailer(env: Environment): Mailer {
  const config = loadSmtpConfig(env);
  return config ? new SmtpMailer(config) : unconfiguredMailer;
}
