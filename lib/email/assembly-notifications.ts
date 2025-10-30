// 조합원 총회 이메일 발송 헬퍼 함수

import type { EmailAttachment } from '@/types/email';
import { getBrandingConfig } from '../branding';
import { GmailService } from './gmail';

interface AssemblyEmailParams {
  brand: string;
  recipients: string[]; // To 수신자 이메일 주소 배열
  recipientType?: 'to' | 'cc' | 'bcc'; // 단일 유형 사용 시 (하위 호환성)
  ccRecipients?: string[]; // CC 수신자 이메일 주소 배열
  bccRecipients?: string[]; // BCC 수신자 이메일 주소 배열
  subject: string;
  body: string;
  attachments?: EmailAttachment[]; // PDF 첨부 파일들
}

/**
 * 조합원 총회 관련 이메일 발송
 */
export async function sendAssemblyEmail(
  params: AssemblyEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      brand,
      recipients,
      recipientType = 'to',
      ccRecipients = [],
      bccRecipients = [],
      subject,
      body,
      attachments,
    } = params;

    const clubName = getBrandingConfig().clubName;

    // GmailService 초기화
    const credentials = GmailService.getGmailCredentials();
    const gmailService = new GmailService(credentials);

    // HTML 본문 생성
    const htmlBody = convertTextToHtml(body, brand);

    // 수신자 유형에 따라 이메일 설정
    let toEmails: string[] = [];
    let ccEmails: string[] = [];
    let bccEmails: string[] = [];

    // 새로운 방식: ccRecipients, bccRecipients가 제공된 경우
    if (ccRecipients.length > 0 || bccRecipients.length > 0) {
      toEmails = recipients;
      ccEmails = ccRecipients;
      bccEmails = bccRecipients;
    } else {
      // 기존 방식: recipientType 사용 (하위 호환성)
      if (recipientType === 'to') {
        toEmails = recipients;
      } else if (recipientType === 'cc') {
        ccEmails = recipients;
      } else if (recipientType === 'bcc') {
        bccEmails = recipients;
      }
    }

    const emailConfig: {
      from: string;
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      html: string;
      text: string;
      replyTo: string;
      attachments: EmailAttachment[];
    } = {
      from: `"${clubName}" <${credentials.senderEmail}>`,
      to: toEmails,
      subject: subject,
      html: htmlBody,
      text: body,
      replyTo: credentials.senderEmail,
      attachments: attachments || [],
    };

    if (ccEmails.length > 0) {
      emailConfig.cc = ccEmails;
    }
    if (bccEmails.length > 0) {
      emailConfig.bcc = bccEmails;
    }

    // 이메일 발송
    const result = await gmailService.sendEmail(emailConfig);

    if (!result.success) {
      console.error('이메일 발송 실패:', result.error);
      return {
        success: false,
        error: result.error || '이메일 발송에 실패했습니다.',
      };
    }

    console.log('이메일 발송 성공:', result.messageId);
    return { success: true };
  } catch (error) {
    console.error('이메일 발송 중 오류:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : '알 수 없는 오류가 발생했습니다.',
    };
  }
}

/**
 * 일반 텍스트를 HTML로 변환 (줄바꿈 처리)
 */
function convertTextToHtml(text: string, brandName: string): string {
  // 줄바꿈을 <br>로 변환
  const bodyHtml = text.replace(/\n/g, '<br>');
  const clubName = getBrandingConfig().clubName;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #0066cc;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .content {
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2 style="margin: 0; color: #0066cc;">${clubName}</h2>
  </div>
  <div class="content">
    ${bodyHtml}
  </div>
  <div class="footer">
    <p>본 메일은 수신/발신이 모두 가능하니, 문의사항이 있으시면 회신 부탁드립니다.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 기본 이메일 제목 생성
 */
export function getDefaultEmailSubject(
  fundName: string,
  assemblyType: 'formation' | 'special' | 'regular' | 'dissolution'
): string {
  const typeNames = {
    formation: '결성총회',
    special: '임시총회',
    regular: '정기총회',
    dissolution: '해산/청산총회',
  };

  return `[${fundName}] ${typeNames[assemblyType]} 안내`;
}

/**
 * 기본 이메일 본문 생성
 */
export function getDefaultEmailBody(
  fundName: string,
  assemblyType: 'formation' | 'special' | 'regular' | 'dissolution',
  assemblyDate: string, // YYYY-MM-DD 형식
  params?: {
    agendaTitles?: string[]; // 의안 제목 목록
    bankName?: string; // 은행명
    accountNumber?: string; // 계좌번호
    gpAddress?: string; // GP 주소
    gpList?: string; // GP 명단
  }
): string {
  switch (assemblyType) {
    case 'formation':
      return getFormationEmailBody(fundName, assemblyDate, params);
    case 'special':
    case 'regular':
    case 'dissolution':
    default:
      return '안녕하십니까.';
  }
}

interface FormationEmailParams {
  agendaTitles?: string[]; // 의안 제목 목록
  bankName?: string; // 은행명
  accountNumber?: string; // 계좌번호
  gpAddress?: string; // GP 주소
  gpList?: string; // GP 명단
}

function getFormationEmailBody(
  fundName: string,
  assemblyDate: string,
  params?: FormationEmailParams
) {
  const date = new Date(assemblyDate);
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const dateStr = `${date.getFullYear()}년 ${
    date.getMonth() + 1
  }월 ${date.getDate()}일(${dayOfWeek})`;

  // 의안 목록 생성
  const agendaText = params?.agendaTitles?.length
    ? params.agendaTitles
        .map((title, index) => ` - 제${index + 1}호 의안: ${title}`)
        .join('\n')
    : ' - 제1호 의안: 규약 승인의 건\n - 제2호 의안: 사업계획 승인의 건';

  // 은행 정보
  const bankName = params?.bankName || '[은행명]';
  const accountNumber = params?.accountNumber || '[계좌번호]';

  // GP 정보
  const gpAddress = params?.gpAddress || '[GP 주소]';
  const gpList = params?.gpList || '[업무집행조합원명]';

  return `안녕하십니까, ${fundName} 조합원 여러분.
${fundName}의 결성총회를 개최하고자 메일을 발송드리게 되었습니다.

* 결성총회 개최

1. 일시: ${dateStr}
2. 부의 안건
${agendaText}

* 안내 사항

1. 출자금 납입
${dateStr} 오전까지 조합원분들께서 각자 약정하신 출자금 납입을 부탁드립니다.
납입 계좌: ${bankName} ${accountNumber} (예금주: ${fundName})

2. 동의서 등 회신
첨부드린 서류인 규약 동의서 / 결성 총회 동의서 / 개인정보 동의서(개인의 경우만)를 프린트 하시고,
개인 정보 동의서에만 주민등록번호 뒷자리를 기재하신 다음 날인(개인은 자필 서명 가능, 법인은 법인인감) 하신 후,
스캔하여 메일로 ${dateStr} 오전까지 회신주시면 감사하겠습니다.
원본 서류는 시간되실 때 천천히 아래 주소로 보내주시면 되겠습니다.
주소: ${gpAddress}

그럼 자세한 내용은 첨부된 문서를 확인하시고, 궁금하신 사항이 있으시면 언제든지 문의해 주시기 바랍니다.

감사합니다.
${gpList} 드림`;
}
