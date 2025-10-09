// PDF 생성 관련 타입 정의

export interface TemplateSection {
  index: number;
  title: string;
  text?: string;
  type?: string;
  sub: TemplateSection[];
  tableConfig?: TableConfig;
}

export interface TableConfig {
  tableType: string;
  headers: Array<{
    label: string;
    property: string;
    width: number;
    align: 'left' | 'center' | 'right';
    headerAlign?: 'left' | 'center' | 'right';
  }>;
}

// 별지 필터 타입
export type AppendixFilter =
  | 'gpMembers' // 업무집행조합원만
  | 'lpMembers' // 유한책임조합원만
  | 'allMembers'; // 모든 조합원

// 별지 렌더링 타입
export type AppendixRenderType =
  | 'repeating-section' // 같은 페이지에 섹션 반복
  | 'repeating-page'; // 각각 새 페이지

// 별지 필드 타입
export interface AppendixField {
  label: string;
  variable: string;
  seal?: boolean; // 날인 표시 필요 여부
}

// 별지 컨텐츠 요소 타입
export interface AppendixContentElement {
  type: 'paragraph' | 'form-fields' | 'spacer' | 'date-field';
  text?: string;
  align?: 'left' | 'center' | 'right';
  fields?: AppendixField[];
  lines?: number;
  format?: string;
}

// 별지 정의
export interface AppendixDefinition {
  id: string;
  title: string;
  type: AppendixRenderType;
  filter: AppendixFilter;
  pageBreak?: 'before' | 'after';
  template: {
    header?: { text: string };
    title?: string;
    sections?: Array<{
      title?: string;
      fields: AppendixField[];
    }>;
    content?: AppendixContentElement[];
  };
}

export interface LPATemplate {
  type: string;
  version: string;
  description: string;
  content: {
    type: string;
    sections: TemplateSection[];
  };
  appendix?: AppendixDefinition[]; // 별지 추가
}

export interface LPAContext {
  fund: {
    id: string;
    name: string;
    nameShort?: string | null; // 펀드 약칭
    address: string | null;
    par_value: number;
    total_cap: number;
    initial_cap: number;
    payment_schedule: 'lump_sum' | 'capital_call';
    duration: number;
    closed_at: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  members: Array<{
    id: string;
    name: string;
    member_type: 'GP' | 'LP';
    total_units: number;
    total_amount: number;
    initial_amount: number;
    address?: string | null; // 주소 (별지용)
    birth_date?: string | null; // 생년월일 (개인)
    business_number?: string | null; // 사업자번호 (법인)
    phone?: string | null; // 연락처
    entity_type?: 'individual' | 'corporate'; // 개인/법인 구분
  }>;
  generatedAt: Date;
  isPreview?: boolean; // 미리보기 모드 여부
  currentMember?: {
    // 별지 렌더링 시 사용
    id: string;
    name: string;
    member_type: 'GP' | 'LP';
    total_units: number;
    total_amount: number;
    initial_amount: number;
    address?: string | null;
    birth_date?: string | null;
    business_number?: string | null;
    phone?: string | null;
    entity_type?: 'individual' | 'corporate';
  };
}

export interface ProcessedLPAContent {
  type: string;
  sections: TemplateSection[];
  processedAt: Date;
}
