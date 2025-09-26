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
