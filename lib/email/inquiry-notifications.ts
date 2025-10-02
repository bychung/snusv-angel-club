import { EmailNotificationType, Profile } from '@/types/database';
import { EmailAttachment, EmailSenderConfig } from '@/types/email';
import { getBrandingConfig } from '../branding';
import { createBrandServerClient } from '../supabase/server';
import { downloadPitchDeckAsAttachment } from './attachment-utils';
import { GmailService } from './gmail';

interface InquiryData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  additionalInfo?: Record<string, any>;
}

interface InquiryEmailOptions {
  type: EmailNotificationType;
  inquiryData: InquiryData;
  subject: string;
  additionalContent?: string;
  attachments?: EmailAttachment[];
}

/**
 * 특정 알림 타입을 구독한 관리자들의 이메일 주소를 가져옵니다.
 */
async function getNotificationRecipients(
  notificationType: EmailNotificationType
): Promise<string[]> {
  const brandClient = await createBrandServerClient();

  const { data: admins, error } = await brandClient.profiles
    .select('email, email_notifications')
    .eq('role', 'ADMIN')
    .not('email_notifications', 'is', null);

  if (error) {
    console.error('관리자 목록 조회 실패:', error);
    return [];
  }

  const recipients = admins
    .filter((admin: Profile) =>
      admin.email_notifications?.includes(notificationType)
    )
    .map((admin: Profile) => admin.email);

  return recipients;
}

/**
 * 문의별 이메일 템플릿을 생성합니다.
 */
function createInquiryEmailTemplate(options: InquiryEmailOptions): {
  html: string;
  text: string;
} {
  const { type, inquiryData, subject, additionalContent } = options;
  const brandConfig = getBrandingConfig();

  const typeLabels = {
    startup_inquiry: '스타트업 IR 문의',
    angel_inquiry: '엔젤클럽 가입 문의',
    signup_inquiry: '회원가입 문의',
    fund_application: '신규 출자 신청',
  };

  const baseText = `
새로운 ${typeLabels[type]}이 접수되었습니다.

문의 정보:
- 이름: ${inquiryData.name}
- 이메일: ${inquiryData.email}
- 접수일시: ${new Date(inquiryData.createdAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
  })}

${additionalContent || ''}

관리자 페이지에서 자세한 내용을 확인하실 수 있습니다.

감사합니다.
${brandConfig.clubName}
  `.trim();

  const baseHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #2563eb; margin: 0;">${brandConfig.clubName}</h2>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">${
          brandConfig.description
        }</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px;">
          📧 새로운 ${typeLabels[type]}
        </h3>
        
        <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; width: 100px;">이름</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${
                inquiryData.name
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151;">이메일</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${
                inquiryData.email
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: 600; color: #374151;">접수일시</td>
              <td style="padding: 8px 0; color: #6b7280;">${new Date(
                inquiryData.createdAt
              ).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
            </tr>
          </table>
        </div>

        ${
          additionalContent
            ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <pre style="margin: 0; font-family: inherit; white-space: pre-wrap; color: #92400e;">${additionalContent}</pre>
        </div>
        `
            : ''
        }
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #6b7280; font-size: 14px; margin-bottom: 15px;">
          관리자 페이지에서 자세한 내용을 확인하실 수 있습니다.
        </p>
        <div style="background-color: #1f2937; color: white; padding: 15px; border-radius: 6px;">
          <p style="margin: 0; font-size: 12px;">
            이 이메일은 ${
              typeLabels[type]
            } 알림 설정에 따라 자동으로 발송되었습니다.
          </p>
        </div>
      </div>
    </div>
  `;

  return { html: baseHtml, text: baseText };
}

/**
 * 문의 접수 시 관리자들에게 알림 이메일을 발송합니다.
 */
export async function sendInquiryNotification(
  options: InquiryEmailOptions
): Promise<void> {
  try {
    // 알림을 받을 관리자들의 이메일 주소 조회
    const recipients = await getNotificationRecipients(options.type);

    if (recipients.length === 0) {
      console.log(`${options.type} 알림을 구독한 관리자가 없습니다.`);
      return;
    }

    // Gmail 서비스 초기화
    const credentials = GmailService.getGmailCredentials();
    const gmailService = new GmailService(credentials);

    // 이메일 템플릿 생성
    const { html, text } = createInquiryEmailTemplate(options);

    // 이메일 설정
    const emailConfig: EmailSenderConfig = {
      from: credentials.senderEmail,
      replyTo: credentials.senderEmail,
      to: [credentials.senderEmail], // 주 수신자는 발송자로 설정
      cc: recipients, // 실제 알림 수신자들은 CC로 설정
      subject: options.subject,
      html,
      text,
      attachments: options.attachments,
    };

    // 이메일 발송
    const result = await gmailService.sendEmail(emailConfig);

    if (result.success) {
      console.log(
        `문의 알림 이메일 발송 성공 - Type: ${options.type}, Recipients: ${recipients.length}명, Message ID: ${result.messageId}`
      );
    } else {
      console.error(
        `문의 알림 이메일 발송 실패 - Type: ${options.type}, Error: ${result.error}`
      );
    }
  } catch (error) {
    console.error('문의 알림 이메일 발송 중 오류:', error);
  }
}

/**
 * 각 문의 타입별 특화된 알림 발송 함수들
 */
export const inquiryNotifications = {
  /**
   * 스타트업 IR 문의 알림 발송
   */
  async sendStartupInquiryNotification(
    inquiryData: InquiryData & {
      company_name?: string;
      position?: string;
      business_model?: string;
      pitch_deck_url?: string;
      pitch_deck_filename?: string;
    }
  ) {
    // 피치덱 첨부파일 다운로드 시도
    let pitchDeckAttachment: EmailAttachment | null = null;
    if (inquiryData.pitch_deck_url) {
      console.log(`피치덱 다운로드 시도: ${inquiryData.pitch_deck_url}`);
      pitchDeckAttachment = await downloadPitchDeckAsAttachment(
        inquiryData.pitch_deck_url,
        inquiryData.pitch_deck_filename
      );

      if (pitchDeckAttachment) {
        console.log(
          `피치덱 첨부파일로 준비 완료: ${pitchDeckAttachment.filename}`
        );
      } else {
        console.log('피치덱 다운로드 실패, 파일 경로를 텍스트로 포함합니다.');
      }
    }

    // 추가 정보 텍스트 구성 (피치덱은 첨부파일로 처리)
    const additionalContent = [
      inquiryData.company_name ? `회사명: ${inquiryData.company_name}` : null,
      inquiryData.position ? `직책: ${inquiryData.position}` : null,
      inquiryData.business_model
        ? `사업모델: ${inquiryData.business_model}`
        : null,
      // 피치덱이 첨부파일로 처리되지 않은 경우에만 파일 경로 포함
      !pitchDeckAttachment && inquiryData.pitch_deck_url
        ? `피치덱 파일: ${inquiryData.pitch_deck_url}`
        : null,
      // 피치덱이 첨부파일로 처리된 경우 안내 메시지 추가
      pitchDeckAttachment ? '피치덱: 첨부파일로 제공됨' : null,
    ]
      .filter(Boolean)
      .join('\n');

    const brandConfig = getBrandingConfig();

    await sendInquiryNotification({
      type: 'startup_inquiry',
      inquiryData,
      subject: `[${brandConfig.clubName}] 새로운 스타트업 IR 문의`,
      additionalContent,
      attachments: pitchDeckAttachment ? [pitchDeckAttachment] : undefined,
    });
  },

  /**
   * 엔젤클럽 가입 문의 알림 발송
   */
  async sendAngelInquiryNotification(
    inquiryData: InquiryData & {
      self_introduction?: string;
    }
  ) {
    const additionalContent = inquiryData.self_introduction
      ? `자기소개:\n${inquiryData.self_introduction}`
      : undefined;

    const brandConfig = getBrandingConfig();

    await sendInquiryNotification({
      type: 'angel_inquiry',
      inquiryData,
      subject: `[${brandConfig.clubNameShort}] 새로운 엔젤클럽 가입 문의`,
      additionalContent,
    });
  },

  /**
   * 회원가입 문의 알림 발송
   */
  async sendSignupInquiryNotification(
    inquiryData: InquiryData & {
      attempted_email?: string;
      provider?: string;
      inquiry_message?: string;
    }
  ) {
    const additionalContent = [
      inquiryData.attempted_email
        ? `시도한 이메일: ${inquiryData.attempted_email}`
        : null,
      inquiryData.provider ? `로그인 방식: ${inquiryData.provider}` : null,
      inquiryData.inquiry_message
        ? `문의내용:\n${inquiryData.inquiry_message}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    await sendInquiryNotification({
      type: 'signup_inquiry',
      inquiryData,
      subject: '[SNUSV] 새로운 회원가입 문의',
      additionalContent,
    });
  },

  /**
   * 신규 출자 신청 알림 발송
   */
  async sendFundApplicationNotification(
    inquiryData: InquiryData & {
      fund_name?: string;
      phone?: string;
      investment_units?: number;
      investment_amount?: number;
      entity_type?: string;
      is_new_application?: boolean;
    }
  ) {
    const entityTypeLabels = {
      individual: '개인',
      corporate: '법인',
    };

    const additionalContent = [
      inquiryData.fund_name ? `펀드명: ${inquiryData.fund_name}` : null,
      inquiryData.phone ? `전화번호: ${inquiryData.phone}` : null,
      inquiryData.entity_type
        ? `투자자 유형: ${
            entityTypeLabels[
              inquiryData.entity_type as 'individual' | 'corporate'
            ] || inquiryData.entity_type
          }`
        : null,
      inquiryData.investment_units
        ? `약정출자좌수: ${inquiryData.investment_units}좌`
        : null,
      inquiryData.investment_amount
        ? `약정출자금액: ${inquiryData.investment_amount.toLocaleString(
            'ko-KR'
          )}원`
        : null,
      inquiryData.is_new_application !== undefined
        ? inquiryData.is_new_application
          ? '신규 출자 신청입니다.'
          : '기존 출자 정보가 수정되었습니다.'
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    const brandConfig = getBrandingConfig();

    await sendInquiryNotification({
      type: 'fund_application',
      inquiryData,
      subject: `[${brandConfig.clubNameShort}] 새로운 출자 신청`,
      additionalContent,
    });
  },
};
