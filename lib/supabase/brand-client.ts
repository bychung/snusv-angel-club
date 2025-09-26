// 브랜드를 데이터에 자동으로 추가하는 헬퍼 함수
export function addBrandToData(data: any, brand: string) {
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, brand }));
  }
  return { ...data, brand };
}

// 테이블별 CRUD 작업 생성 함수
export function createTableOperations(
  supabase: any,
  tableName: string,
  brand: string
) {
  return {
    select: (selectString: string = '*', selectOption?: any) =>
      supabase
        .from(tableName)
        .select(selectString, selectOption)
        .eq('brand', brand),

    insert: (insertData: any, options?: any) =>
      supabase
        .from(tableName)
        .insert(addBrandToData(insertData, brand), options),

    update: (updateData: any, options?: any) =>
      supabase
        .from(tableName)
        .update(addBrandToData(updateData, brand), options)
        .eq('brand', brand),

    upsert: (upsertData: any, options?: any) =>
      supabase
        .from(tableName)
        .upsert(addBrandToData(upsertData, brand), options),

    delete: (options?: any) =>
      supabase.from(tableName).delete(options).eq('brand', brand),
  };
}
