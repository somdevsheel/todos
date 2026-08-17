import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { MailConfig } from "../config/configuration";

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Thin wrapper around nodemailer. In local development, SMTP_HOST points
 * at the MailHog container from docker-compose.dev.yml (view sent mail at
 * http://localhost:8095) — no real email provider is required to develop
 * or test the invitation/password-reset flows end-to-end.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter!: nodemailer.Transporter;
  private mail!: MailConfig;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.mail = this.configService.get<MailConfig>("mail")!;
    this.transporter = nodemailer.createTransport({
      host: this.mail.host,
      port: this.mail.port,
      secure: this.mail.secure,
      auth: this.mail.user ? { user: this.mail.user, pass: this.mail.password } : undefined,
    });
  }

  async send(params: SendMailParams): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"${this.mail.fromName}" <${this.mail.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      this.logger.log(`Sent mail "${params.subject}" to ${params.to}`);
    } catch (error) {
      // Never let a mail-delivery failure surface as a 500 to the caller of
      // an invite/reset endpoint that already succeeded in the database —
      // it's logged loudly instead so ops can see it in the API logs.
      this.logger.error(`Failed to send mail "${params.subject}" to ${params.to}`, (error as Error).stack);
    }
  }
}
