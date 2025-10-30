import { getCurrentBrand } from '@/lib/branding';

// 삽입 시 브랜드 자동 추가
export function addBrandToData<T extends Record<string, any>>(
  data: T
): T & { brand: string } {
  return {
    ...data,
    brand: getCurrentBrand(),
  };
}

// 배치 삽입 시 브랜드 자동 추가
export function addBrandToDataArray<T extends Record<string, any>>(
  dataArray: T[]
): (T & { brand: string })[] {
  const brand = getCurrentBrand();
  return dataArray.map(data => ({ ...data, brand }));
}

/**
 * 재시도 헬퍼 함수
 * @param fn 실행할 비동기 함수
 * @param retries 재시도 횟수 (기본 3회)
 * @param delays 각 재시도 전 대기 시간 배열 (밀리초, 기본 [1000, 5000, 10000])
 * @returns 함수 실행 결과
 * @throws 모든 재시도가 실패하면 마지막 에러를 throw
 */
export async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delays: number[] = [1000, 5000, 10000]
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 마지막 시도에서 실패하면 바로 throw
      if (attempt === retries - 1) {
        throw lastError;
      }

      // 다음 시도 전에 대기
      const delay = delays[attempt] || delays[delays.length - 1];
      console.log(
        `재시도 대기 중... (시도 ${
          attempt + 1
        }/${retries}, ${delay}ms 후 재시도)`
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
