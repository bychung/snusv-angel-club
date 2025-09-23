import type { Company } from './companies';
import type { Profile } from './database';

export interface CompanyDocument {
  id: string;
  company_id: string;
  category: CompanyDocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

// 관계 데이터 포함된 회사 문서 정보
export interface CompanyDocumentWithDetails extends CompanyDocument {
  company?: Company;
  uploader?: Profile;
  company_name?: string;
  company_category?: string[];
  uploader_name?: string;
  uploader_email?: string;
}

// 회사 문서 카테고리 enum
export enum CompanyDocumentCategory {
  IR_DECK = 'ir_deck',
  INVESTMENT_REPORT = 'investment_report',
}

// 카테고리 한국어 이름
export const COMPANY_DOCUMENT_CATEGORY_NAMES = {
  [CompanyDocumentCategory.IR_DECK]: 'IR 자료',
  [CompanyDocumentCategory.INVESTMENT_REPORT]: '투심보고서',
} as const;

// 카테고리 설명
export const COMPANY_DOCUMENT_CATEGORY_DESCRIPTIONS = {
  [CompanyDocumentCategory.IR_DECK]: 'IR 자료',
  [CompanyDocumentCategory.INVESTMENT_REPORT]: '투자 심사 보고서',
} as const;

// 회사 문서 필터링 옵션
export interface CompanyDocumentFilters {
  company_ids?: string[];
  categories?: CompanyDocumentCategory[];
  uploaded_after?: string;
  uploaded_before?: string;
  search?: string; // 파일명 검색
}

// 페이징된 회사 문서 목록 응답
export interface CompanyDocumentsResponse {
  documents: CompanyDocumentWithDetails[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 회사별 문서 현황 응답
export interface CompanyDocumentStatus {
  company: Company;
  documents: CompanyDocumentWithDetails[];
  documents_by_category: Record<
    CompanyDocumentCategory,
    CompanyDocumentWithDetails[]
  >;
  total_documents: number;
  latest_upload: string | null;
}

// 유틸리티 함수들
export function isValidCompanyDocumentCategory(
  category: CompanyDocumentCategory | string
): category is CompanyDocumentCategory {
  return Object.values(CompanyDocumentCategory).includes(
    category as CompanyDocumentCategory
  );
}

export function getCategoryName(category: CompanyDocumentCategory): string {
  return COMPANY_DOCUMENT_CATEGORY_NAMES[category] || category;
}

export function getCategoryDescription(
  category: CompanyDocumentCategory
): string {
  return COMPANY_DOCUMENT_CATEGORY_DESCRIPTIONS[category] || '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
}

export function isAllowedFileType(fileType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  return allowedTypes.includes(fileType);
}

export function getMaxFileSize(): number {
  return 50 * 1024 * 1024; // 50MB
}
