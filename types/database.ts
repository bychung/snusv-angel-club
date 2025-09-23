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
  created_at: string;
  updated_at: string;
}

export interface FundMember {
  id: string;
  fund_id: string;
  profile_id: string;
  investment_units: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface ProfilePermission {
  id: string;
  profile_id: string;
  user_id: string;
  permission_type: 'admin' | 'view';
  granted_by: string;
  granted_at: string;
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
        Insert: Omit<
          FundMember,
          'id' | 'total_amount' | 'created_at' | 'updated_at'
        > & {
          updated_at?: string;
        };
        Update: Partial<
          Omit<FundMember, 'id' | 'total_amount' | 'created_at'>
        > & {
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
    };
  };
}
