import {
  EmailResult,
  EmailSenderConfig,
  GmailCredentials,
} from '@/types/email';
import { JWT } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { getBrandingConfig } from '../branding';
import { extractEmailAddress } from '../utils';

export class GmailService {
  private gmail: gmail_v1.Gmail;
  private senderEmail: string;

  constructor(credentials: GmailCredentials) {
    const { clientEmail, privateKey, senderEmail } = credentials;

    // private key의 \n 문자를 실제 개행문자로 변환
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    this.senderEmail = senderEmail;

    const auth = new JWT({
      email: clientEmail,
      key: formattedPrivateKey,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        // 'https://www.googleapis.com/auth/gmail.readonly',
        // 'https://www.googleapis.com/auth/gmail.modify',
      ],
      subject: this.senderEmail,
    });

    this.gmail = google.gmail({ version: 'v1', auth: auth as any });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendEmail(config: EmailSenderConfig): Promise<EmailResult> {
    try {
      // 이메일 주소 검증 (발신자명 형식 지원)
      const fromEmail = extractEmailAddress(config.from);
      if (
        !this.isValidEmail(fromEmail) ||
        !config.to.every(email => this.isValidEmail(extractEmailAddress(email)))
      ) {
        throw new Error('Invalid email address format');
      }

      const message = this.createMessage(config);

      console.log(`Sending email to: ${config.to.join(', ')}`);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message,
        },
      });

      console.log(`Email sent successfully. Message ID: ${response.data.id}`);

      return {
        messageId: response.data.id!,
        threadId: response.data.threadId!,
        success: true,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        messageId: '',
        threadId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private createMessage(config: EmailSenderConfig): string {
    const boundary = '__MAIL_BOUNDARY__';
    const attachmentBoundary = '__ATTACHMENT_BOUNDARY__';
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(config.subject).toString(
      'base64'
    )}?=`;

    const hasAttachments = config.attachments && config.attachments.length > 0;
    const contentType = hasAttachments
      ? `multipart/mixed; boundary="${boundary}"`
      : `multipart/alternative; boundary="${boundary}"`;

    const messageParts = [
      `From: ${config.from}`,
      `To: ${config.to.join(', ')}`,
      config.replyTo ? `Reply-To: ${config.replyTo}` : '',
      config.cc?.length ? `Cc: ${config.cc.join(', ')}` : undefined,
      config.bcc?.length ? `Bcc: ${config.bcc.join(', ')}` : undefined,
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      `Content-Type: ${contentType}`,
      '',
    ];

    if (hasAttachments) {
      // 메시지 본문을 위한 multipart/alternative 섹션
      messageParts.push(
        `--${boundary}`,
        `Content-Type: multipart/alternative; boundary="${attachmentBoundary}"`,
        '',
        `--${attachmentBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        config.text || 'This is a plain text fallback.',
        '',
        `--${attachmentBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        config.html || config.text || 'This is a test email.',
        '',
        `--${attachmentBoundary}--`,
        ''
      );

      // 첨부파일 섹션
      config.attachments?.forEach(attachment => {
        const attachmentContent = attachment.content.toString('base64');
        messageParts.push(
          `--${boundary}`,
          `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
          'Content-Transfer-Encoding: base64',
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
          attachment.contentId ? `Content-ID: <${attachment.contentId}>` : '',
          '',
          attachmentContent,
          ''
        );
      });

      messageParts.push(`--${boundary}--`);
    } else {
      // 첨부파일이 없는 경우 기존 로직
      messageParts.push(
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        config.text || 'This is a plain text fallback.',
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        config.html || config.text || 'This is a test email.',
        '',
        `--${boundary}--`
      );
    }

    messageParts.push('');

    const messageString = messageParts
      .filter(line => line !== undefined)
      .join('\r\n');

    return Buffer.from(messageString)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  static getGmailCredentials(): GmailCredentials {
    const clientEmail = process.env.GMAIL_CLIENT_EMAIL;
    const privateKey = process.env.GMAIL_PRIVATE_KEY;
    const { email: senderEmail } = getBrandingConfig();

    if (!clientEmail || !privateKey || !senderEmail) {
      throw new Error(
        'Gmail credentials are not properly configured in environment variables'
      );
    }

    return {
      clientEmail,
      privateKey,
      senderEmail,
    };
  }
}
