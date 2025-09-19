// 펀드 상태 관리를 위한 통일된 시스템

// 펀드 상태 타입 정의
export type FundStatus =
  | 'ready'
  | 'processing'
  | 'applied'
  | 'active'
  | 'closing'
  | 'closed';

// 상태별 설정 인터페이스
interface FundStatusConfig {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  colorClasses: string; // tailwind 색상 클래스
  description: string;
}

// 통일된 펀드 상태 설정
export const FUND_STATUS_CONFIG: Record<FundStatus, FundStatusConfig> = {
  ready: {
    label: '결성준비중',
    badgeVariant: 'secondary',
    colorClasses: 'bg-gray-100 text-gray-800',
    description: '펀드 결성을 준비하고 있는 단계입니다.',
  },
  processing: {
    label: '결성진행중',
    badgeVariant: 'default',
    colorClasses: 'bg-blue-100 text-blue-800',
    description: '펀드 결성이 진행되고 있는 단계입니다.',
  },
  applied: {
    label: '등록대기중',
    badgeVariant: 'outline',
    colorClasses: 'bg-yellow-100 text-yellow-800',
    description: '관련 기관에 등록 신청을 완료하고 승인을 기다리는 단계입니다.',
  },
  active: {
    label: '운용중',
    badgeVariant: 'default',
    colorClasses: 'bg-green-100 text-green-800',
    description: '펀드가 정상적으로 운용되고 있는 단계입니다.',
  },
  closing: {
    label: '해산중',
    badgeVariant: 'destructive',
    colorClasses: 'bg-orange-100 text-orange-800',
    description: '펀드 해산 절차가 진행되고 있는 단계입니다.',
  },
  closed: {
    label: '청산완료',
    badgeVariant: 'destructive',
    colorClasses: 'bg-red-100 text-red-800',
    description: '펀드 청산이 완료된 단계입니다.',
  },
};

/**
 * 펀드 상태 라벨을 반환합니다.
 */
export function getFundStatusLabel(status: FundStatus): string {
  return FUND_STATUS_CONFIG[status]?.label || status;
}

/**
 * 펀드 상태에 따른 색상 클래스를 반환합니다.
 */
export function getFundStatusColorClasses(status: FundStatus): string {
  return (
    FUND_STATUS_CONFIG[status]?.colorClasses || 'bg-gray-100 text-gray-800'
  );
}

/**
 * 펀드 상태 설명을 반환합니다.
 */
export function getFundStatusDescription(status: FundStatus): string {
  return FUND_STATUS_CONFIG[status]?.description || '';
}

/**
 * Select 컴포넌트를 위한 옵션 배열을 반환합니다.
 */
export function getFundStatusOptions(): Array<{
  value: FundStatus;
  label: string;
  colorClasses: string;
}> {
  return Object.entries(FUND_STATUS_CONFIG).map(([status, config]) => ({
    value: status as FundStatus,
    label: config.label,
    colorClasses: config.colorClasses,
  }));
}

/**
 * 출자 의향 설문 링크를 표시할 수 있는 상태인지 확인합니다.
 */
export function canShowSurveyLink(status: FundStatus): boolean {
  return status === 'ready' || status === 'processing';
}
