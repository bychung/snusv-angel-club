# Fund Documents Appendix 처리 수정

## 문제 상황

1. **DB 구조**

   - `document_templates` 테이블: `appendix` 컬럼 존재 ✅
   - `fund_documents` 테이블: `appendix` 컬럼 없음 ❌

2. **발생한 버그**

   - 글로벌 템플릿으로 펀드 규약 최초 생성 시: `document_templates.appendix` 사용 → 정상 작동 ✅
   - 이후 규약 재생성 시: `fund_documents.processed_content`만 사용 → appendix 사라짐 ❌

3. **원인 분석**
   - `loadLPATemplateForDocument` 함수가 `fund_documents.processed_content.appendix`를 참조하려 했으나 실제로는 없음
   - `appendix`는 사용자가 수정할 수 없는 데이터이므로 매번 `fund_documents`에 저장할 필요 없음

## 해결 방법 (최종)

### 설계 원칙

- **Content 분리**: 사용자가 수정 가능한 `content`와 수정 불가능한 `appendix`를 명확히 분리
- **단일 출처**: `appendix`는 항상 `document_templates`에서만 관리
- **중복 제거**: `fund_documents`에는 수정된 `content`만 저장

### 1. 템플릿 로드 로직 수정

**파일**: `lib/admin/lpa-context.ts`

#### 1.1 Import 추가

```typescript
import { createBrandServerClient } from '@/lib/supabase/server';
```

#### 1.2 loadLPATemplateForDocument 함수 수정

```typescript
export async function loadLPATemplateForDocument(fundId: string) {
  // 1. fund_documents에서 최신 규약 조회
  const latestDocument = await getActiveFundDocument(fundId, 'lpa');

  if (latestDocument && latestDocument.processed_content) {
    // appendix는 document_templates에서 가져오기
    let appendix = null;

    // 2-1. fund_document에 template_id가 있으면 해당 템플릿에서 appendix 가져오기
    if (latestDocument.template_id) {
      const supabase = await createBrandServerClient();
      const { data: linkedTemplate } = await supabase.documentTemplates
        .select('appendix')
        .eq('id', latestDocument.template_id)
        .single();

      if (linkedTemplate) {
        appendix = linkedTemplate.appendix;
      }
    }

    // 2-2. template_id가 없거나 조회 실패 시 현재 활성 글로벌 템플릿에서 가져오기
    if (!appendix) {
      const globalTemplate = await getActiveTemplate('lpa');
      if (globalTemplate) {
        appendix = globalTemplate.appendix;
      }
    }

    return {
      template: {
        type: 'lpa',
        version: `${latestDocument.version_number}.0.0`,
        description: `v${latestDocument.version_number} 기반 규약`,
        content: latestDocument.processed_content,
        appendix: appendix, // ✨ document_templates에서 가져온 appendix
      },
      templateVersion: `${latestDocument.version_number}.0.0`,
      isFromFundDocument: true,
    };
  }

  // 3. fund_documents에 없으면 글로벌 템플릿 사용
  const dbTemplate = await getActiveTemplate('lpa');
  if (dbTemplate) {
    return {
      template: {
        type: 'lpa',
        version: dbTemplate.version,
        description: dbTemplate.description || '',
        content: dbTemplate.content,
        appendix: dbTemplate.appendix, // ✨ 글로벌 템플릿의 appendix
      },
      templateId: dbTemplate.id,
      templateVersion: dbTemplate.version,
      isFromFundDocument: false,
    };
  }
}
```

### 2. DB 마이그레이션 (051)

**파일**: `supabase/migrations/051_remove_appendix_from_fund_documents.sql`

```sql
-- fund_documents 테이블에서 appendix 컬럼 제거
-- appendix는 사용자가 수정할 수 없는 데이터이므로 document_templates에서만 관리

ALTER TABLE fund_documents
DROP COLUMN IF EXISTS appendix;
```

> **Note**: 50번 마이그레이션에서 appendix 컬럼을 추가했다가 51번에서 제거하는 것이 맞습니다.
> 이미 50번 마이그레이션을 실행한 경우를 대비한 조치입니다.

## 데이터 흐름

### 규약 생성 시

```
1. 템플릿 로드
   ├─ fund_documents 있음?
   │  ├─ content: fund_documents.processed_content ✅
   │  └─ appendix: document_templates (template_id 또는 글로벌) ✅
   └─ fund_documents 없음?
      ├─ content: document_templates.content ✅
      └─ appendix: document_templates.appendix ✅

2. PDF 생성
   └─ content + appendix 병합하여 PDF 생성

3. DB 저장 (saveFundDocument)
   ├─ processed_content: content만 저장 ✅
   └─ appendix: 저장하지 않음 (항상 템플릿에서 가져옴) ✅
```

### 규약 재생성 시

```
1. 템플릿 로드
   ├─ content: 이전 fund_documents.processed_content
   └─ appendix: document_templates (최신 appendix 적용) ✨

2. PDF 생성
   └─ 최신 appendix가 적용된 PDF 생성

3. DB 저장
   └─ content만 새 버전으로 저장
```

## 영향 범위

### 수정된 파일

1. ✅ `lib/admin/lpa-context.ts` (appendix 로드 로직 수정)
2. ✅ `supabase/migrations/051_remove_appendix_from_fund_documents.sql` (신규)

### 수정하지 않은 파일 (변경 불필요)

- `types/database.ts` (appendix 컬럼 원래 없음)
- `lib/admin/fund-documents.ts` (appendix 파라미터 원래 없음)
- `app/api/admin/funds/[fundId]/generated-documents/lpa/generate/route.ts` (appendix 저장 안 함)
- `app/api/admin/funds/[fundId]/templates/[type]/route.ts` (appendix 저장 안 함)

## 마이그레이션 실행

```bash
# Supabase CLI로 마이그레이션 실행
supabase db push

# 또는 Supabase Dashboard에서 SQL Editor로 직접 실행
```

## 장점

1. **데이터 중복 제거**: `appendix`를 `fund_documents`에 중복 저장하지 않음
2. **단일 출처 원칙**: `appendix`는 항상 `document_templates`에서만 관리
3. **자동 업데이트**: 글로벌 템플릿의 `appendix`가 수정되면 자동으로 반영됨
4. **명확한 분리**: 수정 가능한 `content`와 수정 불가능한 `appendix` 명확히 구분

## 테스트 필요 항목

1. [ ] 글로벌 템플릿으로 신규 펀드 규약 생성
2. [ ] 기존 펀드 규약 재생성
3. [ ] 규약 수정 후 저장 및 재생성
4. [ ] 별지(조합원서명단, 조합원동의서) 정상 출력 확인
5. [ ] template_id가 있는 경우 해당 템플릿의 appendix 사용 확인
6. [ ] template_id가 없는 경우 글로벌 템플릿의 appendix 사용 확인

## 참고사항

- 기존 `fund_documents` 레코드는 영향 없음 (appendix 컬럼 원래 없었음)
- `appendix`는 항상 최신 템플릿에서 가져오므로, 글로벌 템플릿 수정 시 자동 반영
- `processed_content`는 사용자가 수정한 내용만 포함
