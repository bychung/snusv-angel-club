export enum DocumentCategory {
  AGREEMENT = 'agreement',
  TAX = 'tax',
  ACCOUNT = 'account',
  REGISTRATION = 'registration',
  INVESTMENT_CERTIFICATE = 'investment_certificate',
  PROPOSAL = 'proposal',
}

export const DOCUMENT_CATEGORY_NAMES = {
  [DocumentCategory.AGREEMENT]: '규약',
  [DocumentCategory.TAX]: '고유번호증',
  [DocumentCategory.ACCOUNT]: '계좌사본',
  [DocumentCategory.REGISTRATION]: '등록원부',
  [DocumentCategory.INVESTMENT_CERTIFICATE]: '투자확인서',
  [DocumentCategory.PROPOSAL]: '펀드제안서',
} as const;

export const DOCUMENT_CATEGORY_DESCRIPTIONS = {
  [DocumentCategory.AGREEMENT]: '조합 규약',
  [DocumentCategory.TAX]: '사업자 고유번호증',
  [DocumentCategory.ACCOUNT]: '펀드 계좌 사본',
  [DocumentCategory.REGISTRATION]: '펀드 등록원부',
  [DocumentCategory.INVESTMENT_CERTIFICATE]: '조합원별 투자확인서',
  [DocumentCategory.PROPOSAL]: '펀드 제안서',
} as const;

// 유틸리티 함수들
export function isValidDocumentCategory(
  category: DocumentCategory | string
): category is DocumentCategory {
  return Object.values(DocumentCategory).includes(category as DocumentCategory);
}

/**
 * 조합원별 문서인지 확인
 */
export function isMemberSpecificDocument(category: DocumentCategory): boolean {
  return category === DocumentCategory.INVESTMENT_CERTIFICATE;
}

/**
 * 공통 문서인지 확인
 */
export function isCommonDocument(category: DocumentCategory): boolean {
  return !isMemberSpecificDocument(category);
}

/**
 * 투자확인서 카테고리인지 확인
 */
export function isInvestmentCertificate(category: DocumentCategory): boolean {
  return category === DocumentCategory.INVESTMENT_CERTIFICATE;
}
