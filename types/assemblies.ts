// 조합원 총회 관련 타입 정의

export type AssemblyType = 'formation' | 'special' | 'regular' | 'dissolution';
export type AssemblyStatus = 'draft' | 'completed' | 'sent';
export type AssemblyEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

// === LPA 규약 동의서 타입 (독립 문서) ===

// Appendix Content Element 타입 (기존 PDF 생성 로직 재사용)
export interface AppendixContentElement {
  type:
    | 'paragraph'
    | 'spacer'
    | 'date-field'
    | 'form-fields'
    | 'table'
    | 'signature-field';
  text?: string;
  align?: 'left' | 'center' | 'right';
  lines?: number;
  format?: string;
  fields?: Array<{
    label: string;
    variable: string;
    seal?: boolean;
  }>;
  columns?: Array<{
    key: string;
    label: string;
    width?: number;
  }>;
  rows?: any[];
}

// LPA 규약 동의서 템플릿
export interface LpaConsentFormTemplate {
  header: {
    text: string;
  };
  title: string;
  content: AppendixContentElement[];
}

// LPA 규약 동의서 컨텍스트 (조합원 정보)
export interface LpaConsentFormContext {
  fund: {
    name: string;
    nameEn?: string;
    closedAt?: string; // 결성 예정일
  };
  gpList: string; // GP 조합원 리스트 (쉼표로 구분)
  lpMembers: Array<{
    id: string; // profile_id (개별 PDF 생성에 필요)
    name: string;
    address: string;
    birthDateOrBusinessNumber: string;
    contact: string;
    shares: number;
    entity_type: 'individual' | 'corporate'; // 개인/법인 구분
  }>;
  generatedAt: string;
  templateVersion: string;
  memberPages?: MemberPage[]; // 페이지 매핑 정보 (통합 문서 생성 시 추가)
}

// LPA 규약 동의서 문서 (content/context 구조)
export interface LpaConsentFormDocument {
  id: string;
  fund_id: string;
  type: 'lpa_consent_form';
  content: LpaConsentFormTemplate; // 생성 시점의 템플릿 스냅샷
  context: LpaConsentFormContext; // 생성 시점의 조합원 정보
  version: string; // 템플릿 버전
  template_id?: string; // 글로벌 템플릿 참조
  pdf_url?: string;
  generated_at: string;
  generated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// LPA 규약 동의서 Diff 정보
export interface LpaConsentFormDiff {
  hasChanges: boolean;
  contextChanges?: {
    lpMembersAdded: string[]; // 추가된 LP 조합원 이름
    lpMembersRemoved: string[]; // 제거된 LP 조합원 이름
    lpMembersModified: Array<{
      name: string;
      changes: Record<string, { old: string; new: string }>;
    }>;
    gpListChanged?: { old: string; new: string };
  };
  templateChanges?: {
    versionChanged: { old: string; new: string };
    contentModified: boolean;
  };
}

// 문서 타입 정의
export type AssemblyDocumentType =
  // 결성총회
  | 'formation_agenda' // 결성총회 의안
  | 'formation_consent_form' // 결성총회 의안 동의서
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
  is_split_parent?: boolean; // 통합 문서 여부
  parent_document_id?: string; // 개별 문서의 경우 부모 문서 ID
  member_id?: string; // 개별 문서의 경우 조합원 ID
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
  // 결성총회 의안 내용
  formation_agenda?: FormationAgendaContent | any; // FormationAgendaContent 또는 템플릿 전체 구조

  // 결성총회 의안 동의서 템플릿 (content는 템플릿 구조 저장)
  formation_consent_form?: FormationConsentFormTemplate;

  // 결성총회 의사록 내용
  formation_minutes?: FormationMinutesContent;

  // 추후 다른 문서 타입 추가
}

// 결성총회 의안 동의서 템플릿 구조
export interface FormationConsentFormTemplate {
  header?: {
    text: string;
  };
  title: string;
  content: Array<{
    type: string;
    text?: string;
    align?: string;
    lines?: number;
    fields?: Array<{
      label: string;
      variable: string;
      seal?: boolean;
    }>;
    [key: string]: any;
  }>;
}

// 조합원 페이지 정보 (context의 member_pages에 저장)
export interface MemberPage {
  member_id: string;
  member_name: string;
  page_number: number; // 1-based
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

// 결성총회 의사록 내용
export interface FormationMinutesContent {
  title_template: string;
  sections: {
    time: {
      label: string;
      value_template: string;
    };
    location: {
      label: string;
      value: string; // 사용자 편집 가능
    };
    attendance: {
      label: string;
      template: string;
      attended_member_ids: string[]; // 사용자 선택 (체크박스)
    };
    member_table: {
      columns: Array<{
        key: string;
        label: string;
        width: number;
      }>;
    };
    opening: {
      label: string;
      template: string;
    };
    agendas: {
      label: string;
      agenda_template: string;
      items: MinutesAgendaItem[]; // 사용자 편집 가능 (result 필드)
    };
    closing: {
      template: string;
    };
    signature: {
      date_label: string;
      fund_name_label: string;
      gp_label: string;
      seal_text: string;
    };
  };
}

export interface MinutesAgendaItem {
  index: number; // 의안 번호
  title: string; // 의안 제목 (의안 문서에서 가져옴)
  result: string; // 승인 결과 (편집 가능)
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
  editable?: boolean; // 템플릿 편집 가능 여부
  template?: {
    // 템플릿 정보
    id: string;
    version: string;
    description: string;
  };
  preview_data?: any; // 미리보기 데이터 (자동 생성 문서용)
  default_content?: any; // 기본 내용 (편집 가능 문서용, 템플릿 전체 구조 포함)
  input_schema?: any; // 필요한 입력 필드 스키마
}

// 총회 타입별 문서 목록 정의
export const ASSEMBLY_DOCUMENT_TYPES: Record<
  AssemblyType,
  AssemblyDocumentType[]
> = {
  formation: [
    'formation_agenda',
    'formation_consent_form',
    // 'formation_minutes',
  ],
  special: ['special_agenda', 'special_minutes'],
  regular: ['regular_agenda', 'regular_minutes'],
  dissolution: ['dissolution_agenda', 'dissolution_minutes'],
};

// 문서 타입별 한글 이름
export const DOCUMENT_TYPE_NAMES: Record<AssemblyDocumentType, string> = {
  formation_agenda: '결성총회 의안',
  formation_consent_form: '결성총회 의안 동의서',
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
