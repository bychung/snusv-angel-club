// 브랜드를 데이터에 자동으로 추가하는 헬퍼 함수
export function addBrandToData(data: any, brand: string) {
  if (Array.isArray(data)) {
    return data.map(item => ({ ...item, brand }));
  }
  return { ...data, brand };
}

interface TableOperationsOptions {
  hasSoftDelete?: boolean; // soft delete 지원 여부 (deleted_at 컬럼 존재)
}

// 테이블별 CRUD 작업 생성 함수
export function createTableOperations(
  supabase: any,
  tableName: string,
  brand: string,
  options: TableOperationsOptions = {}
) {
  const { hasSoftDelete = false } = options;

  return {
    // 기본 select: soft delete가 활성화된 경우 deleted_at IS NULL 자동 적용
    select: (selectString: string = '*', selectOption?: any) => {
      const query = supabase
        .from(tableName)
        .select(selectString, selectOption)
        .eq('brand', brand);

      // soft delete 테이블인 경우 삭제되지 않은 레코드만 조회
      if (hasSoftDelete) {
        return query.is('deleted_at', null);
      }

      return query;
    },

    // 삭제된 레코드를 포함하여 조회 (soft delete 테이블 전용)
    selectWithDeleted: (selectString: string = '*', selectOption?: any) =>
      supabase
        .from(tableName)
        .select(selectString, selectOption)
        .eq('brand', brand),

    // 삭제된 레코드만 조회 (soft delete 테이블 전용)
    selectOnlyDeleted: (selectString: string = '*', selectOption?: any) =>
      supabase
        .from(tableName)
        .select(selectString, selectOption)
        .eq('brand', brand)
        .not('deleted_at', 'is', null),

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
