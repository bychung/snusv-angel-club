export type EmailNotificationType =
  | 'startup_inquiry'
  | 'angel_inquiry'
  | 'signup_inquiry'
  | 'fund_application';

export interface Profile {
  id: string;
  user_id?: string | null;
  name: string;
  phone: string;
  email: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string | null;
  business_number?: string | null;
  address: string;
  role: 'ADMIN' | 'USER';
  email_notifications?: EmailNotificationType[];
  brand: string;
  created_at: string;
  updated_at: string;
}

export interface Fund {
  id: string;
  name: string;
  abbreviation?: string | null;
  tax_number?: string | null;
  gp_id?: string[] | null;
  address?: string | null;
  status: 'ready' | 'processing' | 'applied' | 'active' | 'closing' | 'closed';
  account?: string | null;
  account_bank?: string | null;
  closed_at?: string | null; // 결성일
  registered_at?: string | null; // 등록일
  dissolved_at?: string | null; // 만기일
  par_value: number; // 좌당가격
  min_units: number; // 최소 출자좌수
  payment_schedule: 'lump_sum' | 'capital_call'; // 출자방식 (일시납/수시납)
  display_locations?: ('dashboard' | 'homepage')[] | null; // 링크 노출 위치
  initial_numerator?: number | null; // 초기 출자 비율 (분자)
  initial_denominator?: number | null; // 초기 출자 비율 (분모)
  duration?: number | null; // 펀드 존속기간 (년)
  brand: string;
  created_at: string;
  updated_at: string;
}

export interface FundMember {
  id: string;
  fund_id: string;
  profile_id: string;
  investment_units: number;
  total_units: number; // 약정출자좌수
  updated_by?: string | null; // 최종 수정자 프로필 ID
  brand: string;
  created_at: string;
  updated_at: string;
}

export interface FundMemberChange {
  id: string;
  fund_member_id: string;
  changed_by?: string | null;
  field_name: 'investment_units' | 'total_units' | 'both' | 'created';
  old_value: string;
  new_value: string;
  changed_at: string;
  brand: string;
}

export interface ProfileChange {
  id: string;
  profile_id: string;
  changed_by?: string | null;
  field_name: 'role' | 'email' | 'phone' | 'name' | 'user_id';
  old_value: string;
  new_value: string;
  changed_at: string;
  brand: string;
}

import { Company } from './companies';
import { CompanyDocument } from './company-documents';
import { DocumentCategory } from './documents';
import { Investment } from './investments';

export interface Document {
  id: string;
  fund_id: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string | null;
  member_id?: string | null; // 조합원별 문서용 (투자확인서 등)
  document_year?: number | null; // 연도별 구분용
  brand: string;
  created_at: string;
  updated_at: string;
}

// 문서 템플릿 버전 관리 (전체 브랜드 공통)
export interface DocumentTemplate {
  id: string;
  type: string; // 'lpa', 'plan', 'certificate' 등
  version: string; // '1.0.0', '1.1.0'
  content: any; // JSONB - 템플릿 전체 구조
  is_active: boolean;
  description?: string | null;
  created_at: string;
  created_by?: string | null;
}

// 생성된 문서 기록 (fund를 통해 brand 확인)
export interface FundDocument {
  id: string;
  fund_id: string;
  type: string; // 문서 타입
  version_number: number; // 버전 번호 (1부터 시작)
  is_active: boolean; // 활성 버전 여부 (최신 버전만 true)
  template_id?: string | null;
  template_version: string;
  processed_content: any; // JSONB - 변수 치환 완료된 최종 내용
  generation_context?: any | null; // JSONB - 재생성용 컨텍스트
  pdf_storage_path?: string | null;
  generated_at: string;
  generated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfilePermission {
  id: string;
  profile_id: string;
  user_id: string;
  permission_type: 'admin' | 'view';
  granted_by: string;
  granted_at: string;
  brand: string;
  created_at: string;
}

export interface AccessibleProfile {
  profile: Profile;
  permission: 'owner' | 'admin' | 'view';
  grantedBy?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      funds: {
        Row: Fund;
        Insert: Omit<Fund, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Fund, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      fund_members: {
        Row: FundMember;
        Insert: Omit<FundMember, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<FundMember, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      profile_permissions: {
        Row: ProfilePermission;
        Insert: Omit<ProfilePermission, 'id' | 'granted_at' | 'created_at'>;
        Update: Partial<
          Omit<ProfilePermission, 'id' | 'granted_at' | 'created_at'>
        >;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Document, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>> & {
          updated_at?: string;
        };
      };
      investments: {
        Row: Investment;
        Insert: Omit<Investment, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<
          Omit<Investment, 'id' | 'created_at' | 'updated_at'>
        > & {
          updated_at?: string;
        };
      };
      company_documents: {
        Row: CompanyDocument;
        Insert: Omit<CompanyDocument, 'id' | 'created_at' | 'updated_at'> & {
          updated_at?: string;
        };
        Update: Partial<
          Omit<CompanyDocument, 'id' | 'created_at' | 'updated_at'>
        > & {
          updated_at?: string;
        };
      };
      fund_member_changes: {
        Row: FundMemberChange;
        Insert: Omit<FundMemberChange, 'id' | 'changed_at'>;
        Update: Partial<Omit<FundMemberChange, 'id' | 'changed_at'>>;
      };
      profile_changes: {
        Row: ProfileChange;
        Insert: Omit<ProfileChange, 'id' | 'changed_at'>;
        Update: Partial<Omit<ProfileChange, 'id' | 'changed_at'>>;
      };
      document_templates: {
        Row: DocumentTemplate;
        Insert: Omit<DocumentTemplate, 'id' | 'created_at'>;
        Update: Partial<Omit<DocumentTemplate, 'id' | 'created_at'>>;
      };
      fund_documents: {
        Row: FundDocument;
        Insert: Omit<FundDocument, 'id' | 'generated_at'>;
        Update: Partial<Omit<FundDocument, 'id' | 'generated_at'>>;
      };
    };
  };
}
