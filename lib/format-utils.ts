/**
 * 입력 포맷팅 관련 유틸리티 함수들
 */

/**
 * 사업자등록번호 포맷팅 (123-45-67890)
 * @param value - 입력값 (숫자만 또는 이미 포맷팅된 값)
 * @returns 포맷팅된 사업자등록번호
 */
export function formatBusinessNumber(value: string): string {
  if (!value) return '';

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 5)
    return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
  if (cleanValue.length <= 10)
    return `${cleanValue.slice(0, 3)}-${cleanValue.slice(
      3,
      5
    )}-${cleanValue.slice(5)}`;

  // 10자리 초과시 자르기
  return `${cleanValue.slice(0, 3)}-${cleanValue.slice(
    3,
    5
  )}-${cleanValue.slice(5, 10)}`;
}

/**
 * 법인등록번호 포맷팅 (123456-1234567)
 * @param value - 입력값 (숫자만 또는 이미 포맷팅된 값)
 * @returns 포맷팅된 법인등록번호
 */
export function formatCorporateRegistrationNumber(value: string): string {
  if (!value) return '';

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 6) return cleanValue;
  if (cleanValue.length <= 13)
    return `${cleanValue.slice(0, 6)}-${cleanValue.slice(6)}`;

  // 13자리 초과시 자르기
  return `${cleanValue.slice(0, 6)}-${cleanValue.slice(6, 13)}`;
}

/**
 * 사업자등록번호 유효성 검사
 * @param value - 검사할 사업자등록번호
 * @returns 유효한지 여부
 */
export function validateBusinessNumber(value: string): boolean {
  if (!value) return false;

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length !== 10) return false;

  // 사업자등록번호 체크섬 검증
  const checkDigits = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanValue[i]) * checkDigits[i];
  }

  sum += Math.floor((parseInt(cleanValue[8]) * 5) / 10);
  const checksum = (10 - (sum % 10)) % 10;

  return checksum === parseInt(cleanValue[9]);
}

/**
 * 법인등록번호 유효성 검사
 * @param value - 검사할 법인등록번호
 * @returns 유효한지 여부
 */
export function validateCorporateRegistrationNumber(value: string): boolean {
  if (!value) return false;

  const cleanValue = value.replace(/[^\d]/g, '');

  // 13자리 숫자인지 확인
  return cleanValue.length === 13 && /^\d{13}$/.test(cleanValue);
}

/**
 * 전화번호 포맷팅 (010-1234-5678)
 * @param value - 입력값
 * @returns 포맷팅된 전화번호
 */
export function formatPhoneNumber(value: string): string {
  if (!value) return '';

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 7)
    return `${cleanValue.slice(0, 3)}-${cleanValue.slice(3)}`;
  if (cleanValue.length <= 11)
    return `${cleanValue.slice(0, 3)}-${cleanValue.slice(
      3,
      7
    )}-${cleanValue.slice(7)}`;

  // 11자리 초과시 자르기
  return `${cleanValue.slice(0, 3)}-${cleanValue.slice(
    3,
    7
  )}-${cleanValue.slice(7, 11)}`;
}

/**
 * 숫자만 입력 허용하는 핸들러
 * @param value - 입력값
 * @param maxLength - 최대 길이 (옵션)
 * @returns 숫자만 포함된 값
 */
export function handleNumberOnly(value: string, maxLength?: number): string {
  const cleanValue = value.replace(/[^\d]/g, '');

  if (maxLength && cleanValue.length > maxLength) {
    return cleanValue.slice(0, maxLength);
  }

  return cleanValue;
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 * @param value - 입력값 (숫자만 또는 이미 포맷팅된 값)
 * @returns 포맷팅된 날짜 (YYYY-MM-DD)
 */
export function formatDate(value: string): string {
  if (!value) return '';

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length === 0) return '';
  if (cleanValue.length <= 4) return cleanValue;
  if (cleanValue.length <= 6)
    return `${cleanValue.slice(0, 4)}-${cleanValue.slice(4)}`;
  if (cleanValue.length <= 8)
    return `${cleanValue.slice(0, 4)}-${cleanValue.slice(
      4,
      6
    )}-${cleanValue.slice(6)}`;

  // 8자리 초과시 자르기
  return `${cleanValue.slice(0, 4)}-${cleanValue.slice(
    4,
    6
  )}-${cleanValue.slice(6, 8)}`;
}

/**
 * 날짜 유효성 검사
 * @param value - 검사할 날짜 (YYYY-MM-DD 형식)
 * @returns 유효한지 여부
 */
export function validateDate(value: string): boolean {
  if (!value) return true; // 빈 값은 허용

  const cleanValue = value.replace(/[^\d]/g, '');

  if (cleanValue.length !== 8) return false;

  const year = parseInt(cleanValue.slice(0, 4));
  const month = parseInt(cleanValue.slice(4, 6));
  const day = parseInt(cleanValue.slice(6, 8));

  // 기본적인 범위 검사
  if (year < 1900 || year > new Date().getFullYear() + 100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // JavaScript Date 객체로 유효성 검사
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
