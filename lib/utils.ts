import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function format222Date(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export function formatRegisteredDate(dateString: string): string {
  return format222Date(dateString) + ' 등록';
}

export function formatToMillion(
  amount: number,
  parValue: number = 1000000
): string {
  // todo 반올림 처리 필요
  const roundedAmount = Math.round(amount / parValue);
  return roundedAmount.toString();
}

// 펀드 만기 기간을 계산하는 함수 (dayjs 사용)
export function calculateFundTerm(
  registeredAt: string | null | undefined,
  dissolvedAt: string | null | undefined
): string | null {
  if (!registeredAt || !dissolvedAt) {
    return null;
  }

  try {
    const registered = dayjs(registeredAt);
    const dissolved = dayjs(dissolvedAt);

    // 잘못된 날짜인 경우 null 반환
    if (!registered.isValid() || !dissolved.isValid()) {
      return null;
    }

    // 만기일이 등록일보다 이전이거나 같은 경우 null 반환
    if (dissolved.isBefore(registered) || dissolved.isSame(registered)) {
      return null;
    }

    // 두 날짜 간의 차이를 년 단위로 계산 (소수점 포함)
    const yearsDiff = dissolved.diff(registered, 'year', true);

    // 1년 미만인 경우 null 반환
    if (yearsDiff < 1) {
      return null;
    }

    // 반올림하여 정수 년수로 변환
    const roundedYears = Math.round(yearsDiff);

    return `${roundedYears}년 만기`;
  } catch (error) {
    return null;
  }
}

/**
 * 이메일 주소에서 실제 이메일 부분만 추출
 * "발신자명" <email@example.com> 형식이면 email@example.com만 추출
 * email@example.com 형식이면 그대로 반환
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+)>/);
  return match ? match[1].trim() : emailString.trim();
}
