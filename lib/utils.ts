import { clsx, type ClassValue } from 'clsx';
import dayjs from 'dayjs';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRegisteredDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}.${month}.${day} 등록`;
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
