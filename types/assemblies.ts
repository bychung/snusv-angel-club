// 조합원 총회 관련 타입 정의

export type AssemblyType = 'formation' | 'special' | 'regular' | 'dissolution';
export type AssemblyStatus = 'draft' | 'completed' | 'sent';
export type AssemblyEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

// 문서 타입 정의
export type AssemblyDocumentType =
  // 결성총회
  | 'formation_member_list' // 조합원 명부
  | 'formation_agenda' // 결성총회 의안
  | 'formation_official_letter' // 결성총회 공문
  | 'formation_minutes' // 결성총회 의사록
  | 'fund_registration_application' // 개인투자조합등록신청서
  | 'investment_certificate' // 출자증표
  | 'seal_registration' // 조합인감등록부
  | 'member_consent' // 조합원동의서
  | 'personal_info_consent' // 개인정보동의서
  // 임시총회
  | 'special_agenda' // 임시총회 의안
  | 'special_minutes' // 임시총회 의사록
  // 정기총회
  | 'regular_agenda' // 정기총회 의안
  | 'regular_minutes' // 정기총회 의사록
  // 해산/청산총회
  | 'dissolution_agenda' // 해산/청산총회 의안
  | 'dissolution_minutes'; // 해산/청산총회 의사록

export interface Assembly {
  id: string;
  fund_id: string;
  type: AssemblyType;
  status: AssemblyStatus;
  assembly_date: string; // ISO date string
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  brand: string;
}

export interface AssemblyDocument {
  id: string;
  assembly_id: string;
  type: AssemblyDocumentType;
  content?: AssemblyDocumentContent | null;
  template_id?: string | null;
  template_version?: string | null;
  pdf_storage_path?: string | null;
  generated_by?: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface AssemblyEmail {
  id: string;
  assembly_id: string;
  recipient_ids: string[]; // profile IDs
  recipient_emails: string[];
  subject: string;
  body: string;
  attached_document_ids: string[]; // assembly_document IDs
  status: AssemblyEmailStatus;
  sent_at?: string | null;
  error_message?: string | null;
  sent_by?: string | null;
  created_at: string;
  updated_at: string;
  brand: string;
}

// 문서 내용 타입
export interface AssemblyDocumentContent {
  // 조합원 명부는 자동 생성되므로 content 불필요

  // 결성총회 의안 내용
  formation_agenda?: FormationAgendaContent;

  // 추후 다른 문서 타입 추가
}

export interface FormationAgendaContent {
  chairman: string; // 의장
  agendas: AgendaItem[];
}

export interface AgendaItem {
  index: number; // 의안 번호 (1, 2, 3, ...)
  title: string; // 의안 제목
  content: string; // 의안 내용
}

// API 요청/응답 타입
export interface CreateAssemblyRequest {
  type: AssemblyType;
  assembly_date: string; // ISO date string (YYYY-MM-DD)
}

export interface CreateAssemblyResponse {
  assembly: Assembly;
}

export interface GetAssembliesResponse {
  assemblies: AssemblyWithCounts[];
}

export interface AssemblyWithCounts extends Assembly {
  document_count: number; // 생성된 문서 수
  total_document_count: number; // 해당 총회 유형의 전체 문서 수
  documents?: AssemblyDocument[]; // 생성된 문서 목록 (선택적)
}

export interface GetAssemblyDetailResponse {
  assembly: AssemblyWithCounts;
}

export interface GenerateDocumentRequest {
  type: AssemblyDocumentType;
  content?: AssemblyDocumentContent; // 편집 가능한 문서의 경우 필수
}

export interface GenerateDocumentResponse {
  document: AssemblyDocument;
  pdf_url: string; // 임시 다운로드 URL
}

export interface EmailPreviewResponse {
  recipients: EmailRecipient[];
  subject: string; // 기본 제목
  body: string; // 기본 본문
  attachments: EmailAttachment[];
}

export interface EmailRecipient {
  id: string; // profile ID
  name: string;
  email: string;
}

export interface EmailAttachment {
  id: string; // assembly_document ID
  type: AssemblyDocumentType;
  file_name: string;
}

export interface SendEmailRequest {
  recipient_ids: string[]; // 선택된 수신자 profile IDs
  subject: string; // 편집된 제목
  body: string; // 편집된 본문
  document_ids: string[]; // 첨부할 문서 IDs
}

export interface SendEmailResponse {
  email: AssemblyEmail;
  message: string;
}

// 다음에 생성할 문서 정보
export interface NextDocumentInfo {
  document_type: AssemblyDocumentType;
  requires_input: boolean; // 사용자 입력이 필요한지 여부
  preview_data?: any; // 미리보기 데이터 (자동 생성 문서용)
  default_content?: AssemblyDocumentContent; // 기본 내용 (편집 가능 문서용)
  input_schema?: any; // 필요한 입력 필드 스키마
}

// 총회 타입별 문서 목록 정의
export const ASSEMBLY_DOCUMENT_TYPES: Record<
  AssemblyType,
  AssemblyDocumentType[]
> = {
  formation: [
    'formation_member_list',
    'formation_agenda',
    // Phase 1에서는 위 2개만 구현
    // 'formation_official_letter',
    // 'formation_minutes',
    // 'fund_registration_application',
    // 'investment_certificate',
    // 'seal_registration',
    // 'member_consent',
    // 'personal_info_consent',
  ],
  special: ['special_agenda', 'special_minutes'],
  regular: ['regular_agenda', 'regular_minutes'],
  dissolution: ['dissolution_agenda', 'dissolution_minutes'],
};

// 문서 타입별 한글 이름
export const DOCUMENT_TYPE_NAMES: Record<AssemblyDocumentType, string> = {
  formation_member_list: '조합원 명부',
  formation_agenda: '결성총회 의안',
  formation_official_letter: '결성총회 공문',
  formation_minutes: '결성총회 의사록',
  fund_registration_application: '개인투자조합등록신청서',
  investment_certificate: '출자증표',
  seal_registration: '조합인감등록부',
  member_consent: '조합원동의서',
  personal_info_consent: '개인정보동의서',
  special_agenda: '임시총회 의안',
  special_minutes: '임시총회 의사록',
  regular_agenda: '정기총회 의안',
  regular_minutes: '정기총회 의사록',
  dissolution_agenda: '해산/청산총회 의안',
  dissolution_minutes: '해산/청산총회 의사록',
};

// 총회 타입별 한글 이름
export const ASSEMBLY_TYPE_NAMES: Record<AssemblyType, string> = {
  formation: '결성총회',
  special: '임시총회',
  regular: '정기총회',
  dissolution: '해산/청산총회',
};

// 총회 상태별 한글 이름
export const ASSEMBLY_STATUS_NAMES: Record<AssemblyStatus, string> = {
  draft: '작성 중',
  completed: '완료',
  sent: '발송 완료',
};
