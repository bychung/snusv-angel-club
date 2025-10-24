# 조건부 필드 시스템 구현 문서

## 개요

총회 동의서 및 규약 동의서 템플릿에서 개인/법인에 따라 다른 양식을 렌더링하는 조건부 필드 시스템을 구현했습니다.

## 구현 내용

### 1. 타입 정의 추가 (`lib/pdf/types.ts`)

```typescript
// 조건부 필드 조건 타입
export interface FieldCondition {
  field: string; // 평가할 필드명 (예: 'memberType', 'entity_type')
  operator: 'equals' | 'not_equals' | 'in' | 'not_in'; // 비교 연산자
  value: string | string[]; // 비교 값
}

// AppendixField에 condition 속성 추가
export interface AppendixField {
  label: string;
  variable: string;
  seal?: boolean;
  condition?: FieldCondition; // 조건부 렌더링 조건
}
```

### 2. 조건 평가 로직 (`lib/pdf/template-render.ts`)

`renderAppendixContentElement` 함수의 `form-fields` 케이스에서 각 필드를 렌더링하기 전에 조건을 평가합니다:

```typescript
case 'form-fields': {
  for (const field of element.fields || []) {
    // 조건부 필드 평가
    if (field.condition && !evaluateFieldCondition(field.condition, context)) {
      continue; // 조건을 만족하지 않으면 스킵
    }
    // ... 필드 렌더링
  }
}
```

**조건 평가 함수:**

- `memberType` 또는 `entity_type` 필드를 기준으로 평가
- `individual` (개인) 또는 `corporate` (법인) 값 확인
- `equals`, `not_equals`, `in`, `not_in` 연산자 지원

### 3. 템플릿 수정

#### `formation-consent-form-template.json` (결성총회 동의서)

#### `lpa-consent-form-template.json` (규약 동의서)

```json
{
  "type": "form-fields",
  "fields": [
    {
      "label": "성        명",
      "variable": "${name}",
      "seal": true,
      "condition": {
        "field": "memberType",
        "operator": "equals",
        "value": "individual"
      }
    },
    {
      "label": "회   사   명",
      "variable": "${name}",
      "seal": true,
      "condition": {
        "field": "memberType",
        "operator": "equals",
        "value": "corporate"
      }
    },
    {
      "label": "대 표 이 사",
      "variable": "${ceo}",
      "condition": {
        "field": "memberType",
        "operator": "equals",
        "value": "corporate"
      }
    },
    {
      "label": "생년월일",
      "variable": "${birthDateOrBusinessNumber}",
      "condition": {
        "field": "memberType",
        "operator": "equals",
        "value": "individual"
      }
    },
    {
      "label": "사업자등록번호",
      "variable": "${birthDateOrBusinessNumber}",
      "condition": {
        "field": "memberType",
        "operator": "equals",
        "value": "corporate"
      }
    }
  ]
}
```

### 4. 변수 처리 추가 (`lib/pdf/template-processor.ts`)

법인 대표이사명 변수 처리를 추가했습니다:

```typescript
// 법인 대표이사명
processedText = processedText.replace(
  /\$\{ceo\}/g,
  markPreview(member.ceo || '', isPreview)
);
```

### 5. 타입 확장 (`lib/pdf/types.ts`)

`LPAContext`의 `members`와 `currentMember`에 `ceo` 필드를 추가했습니다:

```typescript
ceo?: string | null; // 법인 대표이사명
```

## 작동 원리

1. **템플릿 파싱**: JSON 템플릿 파일에서 `condition` 속성을 읽음
2. **조건 평가**: 렌더링 시점에 `currentMember.entity_type`을 기준으로 조건 평가
3. **선택적 렌더링**:
   - 개인 조합원: "성명", "생년월일" 필드만 렌더링
   - 법인 조합원: "회사명", "대표자", "사업자등록번호" 필드만 렌더링

## 사용 예시

### 개인 조합원 렌더링 결과:

```
성        명 : 홍길동    (인)
생년월일     : 900101
주        소 : 서울특별시 관악구...
연   락   처 : 010-1234-5678
출 자 좌 수 : 10좌
```

### 법인 조합원 렌더링 결과:

```
회   사   명 : (주)테크스타트업    (인)
대 표 이 사 : 김대표
사업자등록번호: 123-45-67890
주        소 : 서울특별시 강남구...
연   락   처 : 02-1234-5678
출 자 좌 수 : 50좌
```

## 향후 작업 필요 사항

### 1. DB 마이그레이션 필요

`profiles` 테이블에 `ceo` 컬럼을 추가해야 합니다:

```sql
-- 마이그레이션 파일: 054_add_representative_name_to_profiles.sql
ALTER TABLE profiles
ADD COLUMN ceo TEXT;

COMMENT ON COLUMN profiles.ceo IS '법인 대표이사명 (법인만 해당)';
```

### 2. 프론트엔드 수정

법인 조합원 등록/수정 시 대표이사명을 입력받도록 UI 수정 필요:

- `components/admin/AddMemberModal.tsx`
- `components/dashboard/ProfileEditModal.tsx`

### 3. 기존 데이터 마이그레이션

법인 조합원의 경우 대표이사명을 수동으로 입력해야 할 수 있습니다.

## 확장 가능성

현재 구현은 다양한 조건부 렌더링을 지원합니다:

### 예시 1: 여러 값 중 하나와 매칭 (in 연산자)

```json
{
  "label": "특수 필드",
  "variable": "${specialField}",
  "condition": {
    "field": "entity_type",
    "operator": "in",
    "value": ["corporate", "foreign"]
  }
}
```

### 예시 2: 부정 조건 (not_equals)

```json
{
  "label": "개인만 표시",
  "variable": "${personalInfo}",
  "condition": {
    "field": "entity_type",
    "operator": "not_equals",
    "value": "corporate"
  }
}
```

### 예시 3: 다른 필드 기준

```json
{
  "label": "조건부 필드",
  "variable": "${value}",
  "condition": {
    "field": "member_type",
    "operator": "equals",
    "value": "GP"
  }
}
```

## 참고 사항

- 조건이 없는 필드는 항상 렌더링됩니다 (하위 호환성)
- `memberType`과 `entity_type`은 동일하게 처리됩니다
- 조건 평가 실패 시 해당 필드는 자동으로 스킵됩니다
- 여러 조건을 중첩할 수는 없습니다 (향후 AND/OR 로직 추가 가능)

## 테스트 체크리스트

- [x] 타입 정의 추가
- [x] 조건 평가 로직 구현
- [x] 템플릿 파일 수정
- [x] 변수 처리 추가
- [x] 린트 에러 없음
- [ ] 개인 조합원 PDF 생성 테스트
- [ ] 법인 조합원 PDF 생성 테스트
- [ ] DB 마이그레이션 실행
- [ ] 프론트엔드 UI 수정

---

작성일: 2025-10-24
작성자: AI Assistant
