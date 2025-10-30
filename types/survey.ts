export type EntityType = 'individual' | 'corporate';

export interface SurveyData {
  // 기본 정보
  name: string;
  investmentUnits: number;
  phone: string;
  address: string;
  email: string;

  // 개인/법인 구분
  entityType: EntityType | null;

  // 개인인 경우
  birthDate?: string;

  // 법인인 경우
  businessNumber?: string;
  ceo?: string; // 법인 대표이사명
}

export interface SurveyPageConfig {
  pageNumber: number;
  title: string;
  description?: string;
  inputType:
    | 'text'
    | 'number'
    | 'birthDate'
    | 'businessNumber'
    | 'phone'
    | 'email'
    | 'radio'
    | 'submit';
  fieldName: keyof SurveyData;
  validation?: (value: any) => string | null; // null이면 유효, string이면 에러 메시지
  condition?: (data: SurveyData) => boolean; // 페이지 표시 조건
  nextPage?: (data: SurveyData) => number; // 다음 페이지 결정 로직
}

export interface RadioOption {
  value: string;
  label: string;
}
