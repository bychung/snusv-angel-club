export interface EmailSenderConfig {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  messageId: string;
  threadId: string;
  success: boolean;
  error?: string;
}

export interface GmailCredentials {
  clientEmail: string;
  privateKey: string;
  senderEmail: string;
}
