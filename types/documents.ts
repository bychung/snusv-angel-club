export enum DocumentCategory {
  AGREEMENT = 'agreement',
  TAX = 'tax',
  ACCOUNT = 'account',
  REGISTRATION = 'registration',
}

export const DOCUMENT_CATEGORY_NAMES = {
  [DocumentCategory.AGREEMENT]: '규약',
  [DocumentCategory.TAX]: '고유번호증',
  [DocumentCategory.ACCOUNT]: '계좌사본',
  [DocumentCategory.REGISTRATION]: '등록원부',
} as const;

export const DOCUMENT_CATEGORY_DESCRIPTIONS = {
  [DocumentCategory.AGREEMENT]: '조합 규약',
  [DocumentCategory.TAX]: '사업자 고유번호증',
  [DocumentCategory.ACCOUNT]: '펀드 계좌 사본',
  [DocumentCategory.REGISTRATION]: '펀드 등록원부',
} as const;

// 유틸리티 함수들
export function isValidDocumentCategory(
  category: DocumentCategory | string
): category is DocumentCategory {
  return Object.values(DocumentCategory).includes(category as DocumentCategory);
}
