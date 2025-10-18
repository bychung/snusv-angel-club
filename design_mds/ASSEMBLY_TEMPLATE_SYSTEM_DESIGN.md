# 조합원 총회 문서 템플릿 시스템 설계안

## 1. 개요

### 1.1 배경

현재 조합원 총회 문서 생성 시스템은 결성총회에서 2개의 문서(조합원 명부, 결성총회 의안)를 생성할 수 있으나, 템플릿 내용이 코드에 하드코딩되어 있습니다. 이로 인해 템플릿 내용 변경 시마다 코드 수정 및 배포가 필요한 상황입니다.

### 1.2 목표

- 템플릿 내용을 DB에 저장하여 관리
- 시스템 어드민이 별도 UI를 통해 템플릿 수정 가능
- 일반 어드민은 템플릿의 존재를 모르고 기존처럼 문서 생성
- 템플릿 수정 내역은 버전 관리 (롤백 가능)
- 총회 문서 자체는 히스토리 관리 없음 (기존 동일)

### 1.3 범위

**Phase 1 (현재 설계 범위):**

- 결성총회 2개 문서 템플릿만 관리
  - 조합원 명부 템플릿
  - 결성총회 의안 템플릿
- 시스템 어드민 전용 템플릿 관리 UI
- 템플릿 버전 관리 (히스토리 조회, 롤백)

**Phase 2 (향후):**

- 추가 총회 유형 및 문서 템플릿 확장
- 템플릿 복사/내보내기/가져오기 기능

---

## 2. 현재 시스템 분석

### 2.1 현재 하드코딩된 템플릿 위치

#### 2.1.1 결성총회 의안 템플릿

**위치:** `components/admin/assembly-documents/index.ts`

```typescript
formation_agenda: {
  requiresInput: true,
  getDefaultContent: () => ({
    chairman: '',
    agendas: [
      {
        index: 1,
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.',
      },
      {
        index: 2,
        title: '사업계획 승인의 건',
        content: '당 조합은 유망한 중소벤처기업에 투자하여...',
      },
    ],
  }),
  ...
}
```

**추가 하드코딩 위치:**

- `lib/pdf/formation-agenda-generator.ts`:
  - PDF 타이틀: `"${fund_name} 결성총회"`
  - 하단 메시지: `"위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다."`
  - 필드 레이블: `"일시:"`, `"의장:"`, `"부의안건"`

#### 2.1.2 조합원 명부 템플릿

**위치:** `lib/pdf/member-list-generator.ts`

```typescript
// 하드코딩된 내용
- 문서 제목: "조합원 명부"
- 테이블 컬럼: "번호", "조합원명", "생년월일(사업자등록번호)", "주소", "연락처", "출자좌수"
- 하단 레이블: "업무집행조합원", "(조합인감)"
```

### 2.2 문제점

1. **유연성 부족**: 템플릿 내용 변경을 위해 코드 수정 및 재배포 필요
2. **비즈니스 로직과 콘텐츠 혼재**: 내용과 로직이 분리되지 않음
3. **확장성 제한**: 새로운 총회 유형 추가 시 코드 수정 불가피
4. **버전 관리 불가**: 템플릿 변경 이력 추적 어려움

---

## 3. 데이터베이스 설계

### 3.1 기존 `document_templates` 테이블 활용

새로운 테이블을 생성하지 않고, 기존 `document_templates` 테이블을 재사용합니다.

**현재 테이블 구조:**

```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  type VARCHAR(50) NOT NULL,               -- 문서 타입: 'lpa', 'plan', 'formation_agenda' 등
  version VARCHAR(20) NOT NULL,            -- 버전: '1.0.0', '1.1.0', '2.0.0' 형태
  content JSONB NOT NULL,                  -- 템플릿 전체 내용
  is_active BOOLEAN DEFAULT false,         -- 활성 템플릿 여부
  description TEXT,                        -- 변경 사항 설명
  fund_id UUID REFERENCES funds(id),       -- 펀드별 템플릿 (NULL이면 글로벌)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  UNIQUE(type, version, fund_id)
);
```

### 3.2 조합원 총회 템플릿을 위한 컬럼 추가

```sql
-- editable 컬럼 추가: 사용자가 문서 생성 시 내용을 편집할 수 있는지 여부
ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS editable BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_templates_type_active
  ON document_templates(type, is_active)
  WHERE fund_id IS NULL;  -- 글로벌 템플릿만

-- 코멘트 추가
COMMENT ON COLUMN document_templates.editable IS '사용자가 문서 생성 시 편집 가능 여부 (false면 자동 생성)';
```

**필요한 정보와 저장 방법:**

| 템플릿 속성            | 구현 방법                  | 비고                                    |
| ---------------------- | -------------------------- | --------------------------------------- |
| 문서 타입              | `type`                     | 예: 'formation_agenda'                  |
| 템플릿 이름            | (불필요)                   | type으로 구분 가능                      |
| 사용자 편집 가능 여부  | `editable` (신규)          | 새 컬럼 추가 필요                       |
| 에디터 안내 메시지     | `description`              | 기존 컬럼 재사용                        |
| 콘텐츠 기본값          | `content` JSONB            | 의장, 의안 등 실제 편집 가능한 내용     |
| PDF 구조/스타일/레이블 | 코드                       | `lib/pdf/*-config.ts` 파일에서 관리     |
| 버전                   | `version`                  | 형태만 다름 (정수→문자열), '1.0.0' 사용 |
| 활성 버전 여부         | `is_active`                | 동일                                    |
| 브랜드 구분            | `fund_id`                  | NULL = 글로벌 템플릿                    |
| 생성자/시각            | `created_by`, `created_at` | 기존 컬럼 사용                          |
| 수정자/시각            | (없음)                     | 버전별로 레코드 생성되므로 불필요       |

### 3.3 템플릿 버전 관리 전략

**기존 시스템의 버전 관리 방식:**

- 동일 type에 대해 여러 version 레코드 존재
- `is_active = true`인 레코드가 현재 활성 버전
- 모든 버전이 테이블에 보관됨 (별도 히스토리 테이블 없음)

**조합원 총회 템플릿도 동일하게 적용:**

- type: 'formation_agenda', 'formation_member_list'
- version: '1.0.0', '1.1.0', '2.0.0' (시맨틱 버저닝)
- fund_id: NULL (글로벌 템플릿)
- is_active: type당 하나만 true

**예시 데이터:**

```sql
-- 결성총회 의안 템플릿
INSERT INTO document_templates (type, version, content, editable, is_active, description, fund_id)
VALUES
  ('formation_agenda', '1.0.0', '{"user_editable": {...}, "pdf_config": {...}}', true, true, '초기 버전', NULL),

-- 조합원 명부 템플릿
INSERT INTO document_templates (type, version, content, editable, is_active, description, fund_id)
VALUES
  ('formation_member_list', '1.0.0', '{"user_editable": {}, "pdf_config": {...}}', false, true, '초기 버전', NULL);
```

### 3.4 템플릿 `content` JSONB 구조

**설계 철학: "템플릿에는 콘텐츠만, 나머지는 코드에"**

기존 규약 템플릿 시스템과 동일한 방식으로, 템플릿에는 **실제로 자주 바뀌는 콘텐츠(기본값)만** 저장합니다.

**템플릿에 저장할 것 (DB):**

- 사용자가 편집 가능한 필드의 기본값 (의장, 의안 등)
- 자주 바뀔 수 있는 텍스트 레이블 (하단 메시지, 테이블 헤더 등)
- 테이블 구조 정의 (컬럼, 레이블, 너비, 정렬 등)

**코드에서 관리할 것:**

- PDF 렌더링 로직
- 폰트 종류, 크기, 간격 등 스타일 설정
- 에디터 UI 메타데이터 (placeholder, validation 등)

> 💡 **설계 원칙**: 규약 템플릿과 동일한 방식으로, 레이블과 구조는 템플릿에, 스타일은 코드에 분리합니다.

#### 3.4.1 결성총회 의안 템플릿 (editable = true)

**템플릿 내용 (DB에 저장 - document_templates.content):**

```json
{
  "title_template": "{fund_name} 결성총회",
  "labels": {
    "date": "일시:",
    "chairman": "의장:",
    "agendas_section": "부의안건",
    "agenda_title_template": "(제{index}호 의안) {title}"
  },
  "chairman": "",
  "agendas": [
    {
      "title": "규약(안) 승인의 건",
      "content": "첨부한 규약 참조 부탁드립니다."
    },
    {
      "title": "사업계획 승인의 건",
      "content": "당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행"
    }
  ],
  "footer_message": "위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다."
}
```

**생성된 문서 데이터 구조 (assembly_documents):**

```json
// content - 사용자가 편집한 템플릿 데이터
{
  "chairman": "업무집행조합원 프로펠벤처스 대표이사 곽준영",
  "agendas": [
    {
      "title": "규약(안) 승인의 건",
      "content": "첨부한 규약 참조 부탁드립니다."
    },
    {
      "title": "사업계획 승인의 건",
      "content": "당 조합은..."
    }
  ],
  "footer_message": "위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다."
}

// context - 자동 생성된 데이터 (DB 스냅샷)
{
  "fund_name": "서울대벤처스 1호 개인투자조합",
  "assembly_date": "2024년 7월 20일",
  "generated_at": "2024-07-20T10:30:00Z"
}
```

**코드 설정 (lib/pdf/formation-agenda-config.ts):**

```typescript
export const FORMATION_AGENDA_CONFIG = {
  // 폰트 설정
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    section_header: { family: '맑은고딕-Bold', size: 12 },
    body: { family: '맑은고딕', size: 11 },
    footer: { family: '맑은고딕', size: 12 },
  },

  // 간격 설정
  spacing: {
    title_bottom: 3,
    section_spacing: 2,
    agenda_spacing: 2.5,
  },
};
```

**에디터 설정 (components/admin/assembly-documents/index.ts):**

```typescript
export const FORMATION_AGENDA_EDITOR_CONFIG = {
  fields: {
    chairman: {
      label: '의장',
      type: 'text',
      placeholder: '예: 업무집행조합원 프로펠벤처스 대표이사 곽준영',
      required: true,
    },
    agendas: {
      label: '부의안건',
      type: 'array',
      min_items: 1,
      item_fields: {
        title: {
          label: '의안 제목',
          placeholder: '의안 제목',
          required: true,
        },
        content: {
          label: '의안 내용',
          placeholder: '의안 내용',
          required: false,
        },
      },
    },
    footer_message: {
      label: '하단 메시지',
      type: 'textarea',
      placeholder: '하단 메시지',
    },
  },
};
```

**DB 레코드:**

```sql
INSERT INTO document_templates (type, version, content, editable, is_active, description, fund_id, created_by)
VALUES (
  'formation_agenda',
  '1.0.0',
  '{
    "title_template": "{fund_name} 결성총회",
    "labels": {
      "date": "일시:",
      "chairman": "의장:",
      "agendas_section": "부의안건",
      "agenda_title_template": "(제{index}호 의안) {title}"
    },
    "chairman": "",
    "agendas": [
      {"title": "규약(안) 승인의 건", "content": "첨부한 규약 참조 부탁드립니다."},
      {"title": "사업계획 승인의 건", "content": "당 조합은..."}
    ],
    "footer_message": "위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다."
  }',
  true,                                              -- 사용자 편집 가능
  true,                                              -- 활성 버전
  '의안 내용을 검토하고 필요시 수정하세요.',         -- 에디터 안내 메시지
  NULL,                                              -- 글로벌 템플릿
  'system-admin-user-id'
);
```

#### 3.4.2 조합원 명부 템플릿 (editable = false)

**템플릿 내용 (DB에 저장 - document_templates.content):**

```json
{
  "title": "조합원 명부",
  "table_config": {
    "columns": [
      { "key": "no", "label": "번호", "width": 30, "align": "center" },
      { "key": "name", "label": "조합원명", "width": 80, "align": "center" },
      {
        "key": "identifier",
        "label": "생년월일\n(사업자등록번호)",
        "width": 85,
        "align": "center",
        "line_gap": -2
      },
      { "key": "address", "label": "주소", "width": 165, "align": "left" },
      { "key": "phone", "label": "연락처", "width": 75, "align": "center" },
      { "key": "units", "label": "출자좌수", "width": 60, "align": "center" }
    ]
  },
  "footer_labels": {
    "gp_prefix": "업무집행조합원",
    "seal_text": "(조합인감)"
  }
}
```

> 💡 자동 생성 문서이지만, 규약 템플릿과 동일하게 테이블 구조와 레이블은 DB에 저장합니다.

**생성된 문서 데이터 구조 (assembly_documents):**

```json
// content - 빈 객체 (자동 생성이므로 사용자 편집 없음)
{}

// context - 자동 생성된 조합원 데이터 (DB 스냅샷)
{
  "fund_name": "서울대벤처스 1호 개인투자조합",
  "assembly_date": "2024년 7월 20일",
  "gp_info": {
    "name": "프로펠벤처스",
    "representative": "곽준영"
  },
  "members": [
    {
      "no": 1,
      "name": "홍길동",
      "identifier": "1980-01-01",
      "address": "서울시 강남구...",
      "phone": "010-1234-5678",
      "units": 100
    },
    // ... 조합원 목록
  ],
  "generated_at": "2024-07-20T10:30:00Z"
}
```

**코드 설정 (lib/pdf/member-list-config.ts):**

```typescript
export const MEMBER_LIST_CONFIG = {
  // 폰트 설정
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    date: { family: '맑은고딕', size: 12 },
    fund_name: { family: '맑은고딕-Bold', size: 16 },
    gp: { family: '맑은고딕', size: 12 },
    table_header: { family: '맑은고딕-Bold', size: 9 },
    table_body: { family: '맑은고딕', size: 8 },
  },

  // 테이블 스타일
  table_style: {
    row_height: 30,
    zebra_striping: true,
  },
};
```

**DB 레코드:**

```sql
INSERT INTO document_templates (type, version, content, editable, is_active, description, fund_id, created_by)
VALUES (
  'formation_member_list',
  '1.0.0',
  '{
    "title": "조합원 명부",
    "table_config": {
      "columns": [
        {"key": "no", "label": "번호", "width": 30, "align": "center"},
        {"key": "name", "label": "조합원명", "width": 80, "align": "center"},
        {"key": "identifier", "label": "생년월일\\n(사업자등록번호)", "width": 85, "align": "center", "line_gap": -2},
        {"key": "address", "label": "주소", "width": 165, "align": "left"},
        {"key": "phone", "label": "연락처", "width": 75, "align": "center"},
        {"key": "units", "label": "출자좌수", "width": 60, "align": "center"}
      ]
    },
    "footer_labels": {
      "gp_prefix": "업무집행조합원",
      "seal_text": "(조합인감)"
    }
  }',
  false,                                           -- 자동 생성 (사용자 편집 불가)
  true,                                            -- 활성 버전
  '이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로 생성됩니다.',
  NULL,                                            -- 글로벌 템플릿
  'system-admin-user-id'
);
```

### 3.5 기존 테이블 확인: `assembly_documents`

`assembly_documents` 테이블은 이미 `document_templates`를 참조하고 있습니다.

```sql
CREATE TABLE assembly_documents (
  id UUID PRIMARY KEY,
  assembly_id UUID REFERENCES assemblies(id),
  type TEXT NOT NULL,
  content JSONB,

  -- 템플릿 정보 (이미 존재)
  template_id UUID REFERENCES document_templates(id),
  template_version TEXT,  -- '1.0.0' 형태

  pdf_storage_path TEXT,
  generated_by UUID REFERENCES profiles(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(assembly_id, type)
);
```

**문제점**: `content`만 있고 `context`가 없어서 문서 복원 불가능  
**해결책**: `context` 컬럼 추가 필요 (Phase 1 Step 1에서 처리)

---

## 4. 시스템 아키텍처

### 4.1 템플릿 로딩 흐름

```
[일반 어드민 문서 생성]
          ↓
[프론트엔드: 문서 생성 요청]
          ↓
[API: 활성 템플릿 조회 - DB에서]
          ↓
[템플릿 기반 기본값 로드]
          ↓
[사용자 편집 (템플릿 기반)]
          ↓
[PDF 생성 (템플릿 pdf_config 적용)]
          ↓
[문서 저장 (template_id, version 포함)]
```

### 4.2 시스템 어드민 템플릿 관리 흐름

```
[시스템 어드민 로그인]
          ↓
[시스템 설정 > 총회 문서 템플릿 메뉴]
          ↓
[템플릿 목록 조회]
          ↓
[템플릿 선택 & 편집]
          ↓
[변경 사항 미리보기]
          ↓
[저장 확인]
          ↓
[새 버전 생성 + 버전 히스토리 저장]
          ↓
[활성 템플릿 업데이트]
```

---

## 5. API 설계

### 5.1 템플릿 관리 API (시스템 어드민 전용)

#### 5.1.1 템플릿 목록 조회

```
GET /api/system-admin/templates?category=assembly

Response:
{
  "templates": [
    {
      "id": "uuid",
      "type": "formation_agenda",
      "version": "1.0.0",
      "description": "초기 버전",
      "editable": true,
      "is_active": true,
      "created_at": "2024-07-20T10:00:00Z",
      "created_by": { "id": "uuid", "name": "관리자" }
    },
    {
      "id": "uuid",
      "type": "formation_member_list",
      "version": "1.0.0",
      "description": "초기 버전",
      "editable": false,
      "is_active": true,
      "created_at": "2024-07-15T10:00:00Z",
      "created_by": { "id": "uuid", "name": "관리자" }
    }
  ]
}
```

**쿼리 파라미터:**

- `category=assembly`: 조합원 총회 관련 템플릿만 필터링 (type이 'formation\_\*' 등으로 시작하는 것)

#### 5.1.2 템플릿 상세 조회 (활성 버전)

```
GET /api/system-admin/templates/by-type/{type}?active=true

예: GET /api/system-admin/templates/by-type/formation_agenda?active=true

Response:
{
  "template": {
    "id": "uuid",
    "type": "formation_agenda",
    "version": "1.0.0",
    "content": {
      "user_editable": { ... },
      "pdf_config": { ... }
    },
    "description": "초기 버전",
    "editable": true,
    "is_active": true,
    "fund_id": null,
    "created_at": "2024-07-20T10:00:00Z",
    "created_by": { "id": "uuid", "name": "관리자" }
  }
}
```

#### 5.1.3 템플릿 수정 (새 버전 생성)

```
POST /api/system-admin/templates

Body:
{
  "type": "formation_agenda",
  "version": "1.1.0",  // 새 버전 번호
  "content": {
    "user_editable": { ... },
    "pdf_config": { ... }
  },
  "description": "기본 의안 내용 수정",
  "editable": true,
  "fund_id": null
}

Response:
{
  "template": {
    "id": "new-uuid",
    "type": "formation_agenda",
    "version": "1.1.0",
    ...
  },
  "previous_version": "1.0.0"
}

동작:
1. 새 버전 레코드 생성 (새 id)
2. 이전 활성 템플릿의 is_active를 false로 변경
3. 새 템플릿의 is_active를 true로 설정
```

#### 5.1.4 템플릿 버전 히스토리 조회

```
GET /api/system-admin/templates/by-type/{type}/versions

예: GET /api/system-admin/templates/by-type/formation_agenda/versions

Response:
{
  "type": "formation_agenda",
  "versions": [
    {
      "id": "uuid",
      "version": "1.1.0",
      "description": "기본 의안 내용 수정",
      "is_active": true,
      "created_by": { "id": "uuid", "name": "관리자" },
      "created_at": "2024-07-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "version": "1.0.0",
      "description": "초기 버전",
      "is_active": false,
      "created_by": { "id": "uuid", "name": "시스템" },
      "created_at": "2024-07-01T10:00:00Z"
    }
  ]
}
```

#### 5.1.5 특정 버전으로 롤백

```
POST /api/system-admin/templates/{templateId}/activate

Body:
{
  "description": "버전 1.0.0으로 롤백"  // 선택
}

Response:
{
  "template": {
    "id": "uuid",  // 기존 버전의 id
    "type": "formation_agenda",
    "version": "1.0.0",
    "is_active": true,  // 다시 활성화됨
    ...
  }
}

동작:
1. 현재 활성 템플릿의 is_active를 false로 변경
2. 지정된 템플릿의 is_active를 true로 변경
3. 필요시 description 업데이트
```

**참고:** 기존 시스템에서는 버전을 레코드로 관리하므로, 롤백은 단순히 이전 버전을 다시 활성화하는 방식입니다.

#### 5.1.6 템플릿 미리보기 (PDF 생성 테스트)

```
POST /api/system-admin/templates/preview

Body:
{
  "type": "formation_agenda",
  "content": {                   // 수정 중인 템플릿 내용
    "title_template": "{fund_name} 결성총회",
    "labels": {
      "date": "일시:",
      "chairman": "의장:",
      "agendas_section": "부의안건",
      "agenda_title_template": "(제{index}호 의안) {title}"
    },
    "chairman": "테스트 의장",
    "agendas": [
      {"title": "...", "content": "..."}
    ],
    "footer_message": "..."
  },
  "test_data": {                 // 테스트용 샘플 데이터
    "fund_name": "테스트조합",
    "assembly_date": "2024-07-20"
  }
}

Response: PDF Buffer (미리보기용)
```

### 5.2 기존 API 수정

#### 5.2.1 다음 문서 정보 조회 (수정)

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document

Response:
{
  "document_type": "formation_agenda",
  "editable": true,
  "template": {                       // 활성 템플릿 정보
    "id": "uuid",
    "version": "1.0.0",
    "description": "의안 내용을 검토하고 필요시 수정하세요."
  },
  "default_content": {                // 템플릿 content 그대로
    "title_template": "{fund_name} 결성총회",
    "labels": {...},
    "chairman": "",
    "agendas": [...],
    "footer_message": "..."
  }
}

변경:
- document_templates에서 활성 템플릿 조회 (type = document_type, is_active = true, fund_id IS NULL)
- content를 그대로 default_content로 반환
- editable 컬럼 값 반환
```

#### 5.2.2 문서 생성 (수정)

```
POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate

Body:
{
  "type": "formation_agenda",
  "content": {  // editable=true인 경우에만
    "chairman": "...",
    "agendas": [...]
  }
}

Response:
{
  "document_id": "uuid",
  "pdf_url": "...",
  "generated_at": "..."
}

동작 변경:
1. document_type으로 활성 템플릿 조회 (document_templates 테이블)
2. DB에서 자동 생성 데이터 조회 (펀드 정보, 총회 정보, 조합원 목록 등)
3. context 생성:
   - 펀드명, 총회일시
   - 조합원 명부의 경우: 전체 조합원 목록 스냅샷
4. content + context + 템플릿 레이블 결합하여 PDF 생성
5. assembly_documents에 저장:
   - content: 사용자 편집 데이터
   - context: 자동 생성 데이터 (스냅샷)
   - template_id, template_version
```

---

## 6. 프론트엔드 설계

### 6.1 시스템 어드민 전용 메뉴 추가

#### 6.1.1 메뉴 구조

```
시스템 설정 (기존)
├── 사용자 관리
├── 이메일 설정
├── 시스템 로그
└── 총회 문서 템플릿 관리 ← 신규 추가
```

**권한:**

- `role = 'system_admin'` 인 사용자만 접근 가능
- 일반 어드민 (`role = 'admin'`)은 메뉴 자체가 보이지 않음

#### 6.1.2 라우트

```
/admin/system/templates?category=assembly
```

**참고:** 기존 규약 템플릿 관리와 동일한 경로를 사용하되, `category` 파라미터로 구분합니다.

### 6.2 템플릿 관리 UI

#### 6.2.1 템플릿 목록 화면

```
┌───────────────────────────────────────────────────────────┐
│  총회 문서 템플릿 관리                                      │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  📋 총회 문서 생성 시 사용되는 템플릿을 관리합니다.         │
│     템플릿 수정 시 이후 생성되는 모든 문서에 반영됩니다.     │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 결성총회 의안 템플릿                    버전: 3     │  │
│  │ formation_agenda                                  │  │
│  │                                                   │  │
│  │ 마지막 수정: 2024-07-20 by 관리자                  │  │
│  │ 설명: 결성총회에서 사용되는 의안 문서 템플릿       │  │
│  │                                                   │  │
│  │ [편집하기] [버전 히스토리] [미리보기]              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 조합원 명부 템플릿                      버전: 2     │  │
│  │ formation_member_list                             │  │
│  │                                                   │  │
│  │ 마지막 수정: 2024-07-15 by 관리자                  │  │
│  │ 설명: 결성총회용 조합원 명부 문서 템플릿           │  │
│  │                                                   │  │
│  │ [편집하기] [버전 히스토리] [미리보기]              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

#### 6.2.2 템플릿 편집 화면 (결성총회 의안)

```
┌───────────────────────────────────────────────────────────┐
│  템플릿 편집: 결성총회 의안 템플릿            현재 버전: 3  │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ⚠️ 템플릿 수정은 이후 생성되는 모든 문서에 반영됩니다.     │
│     기존에 생성된 문서는 영향을 받지 않습니다.              │
│                                                            │
│  ┌── 기본 정보 ──────────────────────────────────────┐   │
│  │ 템플릿 이름: [결성총회 의안 템플릿              ]  │   │
│  │ 설명: [결성총회에서 사용되는 의안 문서 템플릿   ]  │   │
│  │ 에디터 안내: [의안 내용을 검토하고 필요시 수정...]│   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌── 기본 콘텐츠 (사용자 입력 초기값) ───────────────┐   │
│  │                                                   │   │
│  │ 의장 필드:                                         │   │
│  │   라벨: [의장                                  ]  │   │
│  │   필수: ☑                                         │   │
│  │   플레이스홀더: [예: 업무집행조합원 프로펠...  ]  │   │
│  │                                                   │   │
│  │ 기본 의안 목록:                                    │   │
│  │   ┌─────────────────────────────────────────┐    │   │
│  │   │ 제1호 의안                               │    │   │
│  │   │ 제목: [규약(안) 승인의 건           ]    │    │   │
│  │   │ 내용: [첨부한 규약 참조 부탁드립니다.]   │    │   │
│  │   │                          [삭제]          │    │   │
│  │   └─────────────────────────────────────────┘    │   │
│  │   ┌─────────────────────────────────────────┐    │   │
│  │   │ 제2호 의안                               │    │   │
│  │   │ 제목: [사업계획 승인의 건           ]    │    │   │
│  │   │ 내용: [당 조합은 유망한 중소벤처...  ]  │    │   │
│  │   │                          [삭제]          │    │   │
│  │   └─────────────────────────────────────────┘    │   │
│  │   [+ 의안 추가]                                   │   │
│  │                                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌── PDF 생성 설정 ───────────────────────────────────┐   │
│  │                                                   │   │
│  │ 제목 템플릿: [{fund_name} 결성총회          ]    │   │
│  │                                                   │   │
│  │ 레이블:                                            │   │
│  │   일시: [일시:                              ]    │   │
│  │   의장: [의장:                              ]    │   │
│  │   부의안건 섹션: [부의안건                  ]    │   │
│  │   의안 제목: [(제{index}호 의안) {title}   ]    │   │
│  │                                                   │   │
│  │ 하단 메시지:                                       │   │
│  │   [위 의안에 대하여 조합원 여러분들의 승인을... ] │   │
│  │                                                   │   │
│  │ 폰트 크기:                                         │   │
│  │   제목: [18 ]  섹션 헤더: [12 ]  본문: [11 ]    │   │
│  │                                                   │   │
│  │ 간격 설정:                                         │   │
│  │   제목 하단: [3  ]  섹션: [2  ]  의안: [2.5]    │   │
│  │                                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  변경 요약 (선택):                                         │
│  [기본 의안 내용 수정                                   ]  │
│                                                            │
│                  [취소] [미리보기] [저장 (새 버전 생성)]   │
└───────────────────────────────────────────────────────────┘
```

**기능:**

- **실시간 미리보기**: 샘플 데이터로 PDF 미리보기 가능
- **변경 요약**: 어떤 변경을 했는지 간단히 기록 (버전 히스토리에 표시)
- **저장**: 새 버전 생성 확인 후 저장

#### 6.2.3 템플릿 편집 화면 (조합원 명부)

```
┌───────────────────────────────────────────────────────────┐
│  템플릿 편집: 조합원 명부 템플릿              현재 버전: 2  │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ⚠️ 템플릿 수정은 이후 생성되는 모든 문서에 반영됩니다.     │
│                                                            │
│  ┌── 기본 정보 ──────────────────────────────────────┐   │
│  │ 템플릿 이름: [조합원 명부 템플릿                ]  │   │
│  │ 설명: [결성총회용 조합원 명부 문서 템플릿       ]  │   │
│  │ 에디터 안내: [이 문서는 자동으로 생성됩니다...  ]  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌── PDF 생성 설정 ───────────────────────────────────┐   │
│  │                                                   │   │
│  │ 문서 제목: [조합원 명부                       ]  │   │
│  │                                                   │   │
│  │ 테이블 컬럼 설정:                                  │   │
│  │   ┌──────────────────────────────────────────┐   │   │
│  │   │ 1. 번호 (no)                             │   │   │
│  │   │    라벨: [번호      ] 너비: [30 ] px    │   │   │
│  │   │    정렬: [가운데 ▼]                      │   │   │
│  │   └──────────────────────────────────────────┘   │   │
│  │   ┌──────────────────────────────────────────┐   │   │
│  │   │ 2. 조합원명 (name)                       │   │   │
│  │   │    라벨: [조합원명  ] 너비: [80 ] px    │   │   │
│  │   │    정렬: [가운데 ▼]                      │   │   │
│  │   └──────────────────────────────────────────┘   │   │
│  │   ┌──────────────────────────────────────────┐   │   │
│  │   │ 3. 생년월일/사업자번호 (identifier)       │   │   │
│  │   │    라벨: [생년월일\n(사업자등록번호)] px │   │   │
│  │   │    너비: [85 ] px                        │   │   │
│  │   │    정렬: [가운데 ▼]  줄간격: [-2  ]     │   │   │
│  │   └──────────────────────────────────────────┘   │   │
│  │   ... (주소, 연락처, 출자좌수)                     │   │
│  │                                                   │   │
│  │ 테이블 설정:                                       │   │
│  │   행 높이: [30 ] px                               │   │
│  │   본문 폰트: [8 ] pt  헤더 폰트: [9 ] pt         │   │
│  │   Zebra 줄무늬: ☑                                 │   │
│  │                                                   │   │
│  │ 하단 레이블:                                       │   │
│  │   업무집행조합원 접두사: [업무집행조합원    ]    │   │
│  │   인감 텍스트: [(조합인감)                  ]    │   │
│  │                                                   │   │
│  │ 폰트 크기:                                         │   │
│  │   제목: [18 ]  날짜: [12 ]                       │   │
│  │   조합명: [16 ]  업무집행조합원: [12 ]           │   │
│  │                                                   │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  변경 요약 (선택):                                         │
│  [컬럼 너비 조정                                        ]  │
│                                                            │
│                  [취소] [미리보기] [저장 (새 버전 생성)]   │
└───────────────────────────────────────────────────────────┘
```

#### 6.2.4 버전 히스토리 화면

```
┌───────────────────────────────────────────────────────────┐
│  버전 히스토리: 결성총회 의안 템플릿                        │
├───────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 버전 3 (현재 활성)                     2024-07-20   │  │
│  │                                                    │  │
│  │ 변경 요약: 기본 의안 내용 수정                      │  │
│  │ 변경자: 관리자                                      │  │
│  │                                                    │  │
│  │ [상세 보기] [미리보기]                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 버전 2                                 2024-07-15   │  │
│  │                                                    │  │
│  │ 변경 요약: 폰트 크기 조정                           │  │
│  │ 변경자: 관리자                                      │  │
│  │                                                    │  │
│  │ [상세 보기] [미리보기] [이 버전으로 롤백]           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 버전 1                                 2024-07-01   │  │
│  │                                                    │  │
│  │ 변경 요약: 초기 버전                                │  │
│  │ 변경자: 시스템                                      │  │
│  │                                                    │  │
│  │ [상세 보기] [미리보기] [이 버전으로 롤백]           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                            │
│                                                [닫기]      │
└───────────────────────────────────────────────────────────┘
```

**기능:**

- **상세 보기**: 해당 버전의 전체 템플릿 내용 표시 (읽기 전용)
- **미리보기**: 해당 버전으로 샘플 PDF 생성하여 미리보기
- **롤백**: 선택한 버전의 내용으로 새 버전 생성

### 6.3 일반 어드민 화면 변경 없음

일반 어드민이 사용하는 문서 생성 UI는 **변경 없음**:

- `AssemblyDocumentGenerationModal.tsx`는 그대로 유지
- 내부적으로 DB에서 템플릿을 로드하여 사용
- 사용자는 템플릿의 존재를 알 필요 없음

---

## 7. 컴포넌트 구조

### 7.1 신규 컴포넌트

```
components/admin/
├── AssemblyTemplateManagement.tsx            # 조합원 총회 템플릿 관리 메인
├── AssemblyTemplateList.tsx                  # 템플릿 목록 (기존 TemplateList 유사)
├── AssemblyTemplateCard.tsx                  # 개별 템플릿 카드
├── AssemblyTemplateEditModal.tsx             # 템플릿 편집 모달
│   ├── FormationAgendaTemplateEditor.tsx     # 의안 템플릿 에디터
│   └── MemberListTemplateEditor.tsx          # 명부 템플릿 에디터
├── TemplateVersionHistory.tsx                # 버전 히스토리 모달 (기존 컴포넌트 재사용)
└── TemplatePreviewModal.tsx                  # 템플릿 미리보기 모달 (기존 컴포넌트 재사용)

lib/admin/
├── templates.ts                              # 범용 템플릿 관리 함수 (기존)
└── assembly-templates.ts                     # 조합원 총회 템플릿 특화 함수 (신규)

app/api/system-admin/templates/
├── route.ts                                  # GET (목록), POST (생성)
├── by-type/
│   └── [type]/
│       ├── route.ts                          # GET (활성 버전 조회)
│       └── versions/
│           └── route.ts                      # GET (버전 목록)
├── [templateId]/
│   ├── route.ts                              # GET (특정 버전 상세)
│   └── activate/
│       └── route.ts                          # POST (활성화/롤백)
└── preview/
    └── route.ts                              # POST (미리보기)
```

**참고:**

- 기존 `document_templates` 테이블을 사용하므로 API 경로도 기존 시스템과 통합
- 조합원 총회 전용 UI 컴포넌트는 별도로 작성
- 버전 히스토리, 미리보기 등 공통 기능은 기존 컴포넌트 재사용 가능

### 7.2 기존 컴포넌트 수정

**수정 최소화 원칙:**

- `AssemblyDocumentGenerationModal.tsx`: API 응답 구조 변경에 맞춰 수정
- `components/admin/assembly-documents/index.ts`: 에디터 설정 정의, DB 템플릿 연동
- `lib/admin/assembly-documents.ts`: 템플릿 조회 로직 추가
- `lib/pdf/formation-agenda-generator.ts`: config 파일 사용하도록 수정
- `lib/pdf/member-list-generator.ts`: config 파일 사용하도록 수정

---

## 8. 구현 단계

### Phase 1: 데이터베이스 및 초기 설정 (Step 1-2)

#### Step 1: 데이터베이스 마이그레이션

- [ ] `supabase/migrations/XXX_add_editable_to_document_templates.sql`

  - `document_templates` 테이블에 `editable` 컬럼 추가
  - 기본값: `true`
  - 기존 데이터 (규약 템플릿) 유지

- [ ] `supabase/migrations/XXX_add_context_to_assembly_documents.sql`
  - `assembly_documents` 테이블에 `context` 컬럼 추가
  - `JSONB` 타입
  - `fund_documents`의 `generation_context`와 동일한 역할

```sql
-- assembly_documents 테이블에 context 컬럼 추가
ALTER TABLE assembly_documents
ADD COLUMN IF NOT EXISTS context JSONB;

COMMENT ON COLUMN assembly_documents.content IS '템플릿 기반 데이터 (사용자 편집 가능)';
COMMENT ON COLUMN assembly_documents.context IS '자동 생성 데이터 (DB 스냅샷, 펀드명, 총회일시, 조합원 목록 등)';
```

#### Step 2: 초기 템플릿 데이터 삽입 스크립트

- [ ] `scripts/initialize-assembly-templates.ts` 작성
  - 현재 하드코딩된 템플릿 내용을 DB로 이관
  - `document_templates` 테이블에 삽입
  - 2개 템플릿 (formation_agenda, formation_member_list)
  - type, version ('1.0.0'), content, editable, is_active (true), fund_id (NULL)

### Phase 2: 백엔드 API 구현 (Step 3-5)

#### Step 3: 시스템 어드민 템플릿 관리 API

- [ ] `GET /api/system-admin/templates?category=assembly` (목록)
- [ ] `GET /api/system-admin/templates/by-type/{type}?active=true` (활성 버전 조회)
- [ ] `POST /api/system-admin/templates` (새 버전 생성)
- [ ] `GET /api/system-admin/templates/by-type/{type}/versions` (히스토리)
- [ ] `POST /api/system-admin/templates/{id}/activate` (활성화/롤백)
- [ ] `POST /api/system-admin/templates/preview` (미리보기)

#### Step 4: 템플릿 관리 함수

- [ ] `lib/admin/templates.ts` 확장 (기존 파일이 있으면 재사용)
  - `getActiveTemplateByType(type, fundId?)`: 활성 템플릿 조회
  - `createTemplateVersion(params)`: 새 버전 생성 및 이전 버전 비활성화
  - `activateTemplate(templateId)`: 특정 버전 활성화 (롤백)
- [ ] `lib/admin/assembly-templates.ts` 신규 작성
  - 조합원 총회 템플릿 특화 함수
  - `getAssemblyTemplates()`: 조합원 총회 템플릿 목록
  - `validateTemplateContent(type, content)`: 템플릿 내용 검증

#### Step 5: 기존 API 수정

- [ ] `GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document`
  - DB에서 활성 템플릿 조회하도록 수정
- [ ] `POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate`
  - 템플릿 기반 PDF 생성

### Phase 3: PDF 생성 로직 수정 (Step 6-7)

#### Step 6: PDF Generator 리팩토링 및 설정 파일 생성

- [ ] `lib/pdf/formation-agenda-config.ts` 신규 생성
  - PDF 스타일 설정 상수 정의 (폰트, 간격 등)
- [ ] `lib/pdf/member-list-config.ts` 신규 생성
  - PDF 스타일 설정 상수 정의 (폰트, 테이블 스타일 등)
- [ ] `lib/pdf/formation-agenda-generator.ts` 수정
  - config 파일에서 스타일 설정 import
  - 템플릿 content(레이블, 텍스트)와 config(스타일)를 결합하여 PDF 생성
  - 하드코딩된 모든 텍스트 제거
- [ ] `lib/pdf/member-list-generator.ts` 수정
  - config 파일에서 스타일 설정 import
  - 템플릿 content(테이블 구조, 레이블)를 사용하여 PDF 생성
  - 하드코딩된 모든 레이블/구조 제거

#### Step 7: assembly-documents.ts 수정

- [ ] `generateAssemblyDocumentBuffer()` 수정
  - 템플릿 조회 로직 추가
  - **context 생성 로직 추가**:
    - 펀드 정보 조회 (fund_name, assembly_date 등)
    - 조합원 명부의 경우: 전체 조합원 목록 스냅샷
  - 템플릿 content + context + config를 결합하여 PDF generator에 전달
- [ ] `saveAssemblyDocument()` 수정
  - `content`와 `context`를 분리하여 저장
  - content: 사용자 편집 데이터만
  - context: 자동 생성 데이터 (DB 스냅샷)
- [ ] `components/admin/assembly-documents/index.ts` 수정
  - 에디터 설정 정의 (placeholder, label 등)
  - `getDefaultContent()` 함수를 DB 템플릿 기반으로 수정

### Phase 4: 문서 복원 기능 구현 (Step 8)

#### Step 8: PDF 재생성 기능

- [ ] `regenerateAssemblyDocument()` 함수 작성
  - 기존 `assembly_documents`에서 `content`와 `context` 조회
  - 템플릿 조회 (현재 활성 버전 또는 저장된 버전)
  - content + context + 템플릿으로 PDF 재생성
  - 사용 사례:
    - 관리자가 과거 문서 재다운로드
    - 템플릿 수정 후 기존 문서 업데이트

### Phase 5: 프론트엔드 UI 구현 (Step 9-11)

#### Step 9: 시스템 어드민 메뉴 추가

- [ ] 기존 `app/admin/system/settings/page.tsx` 또는 별도 페이지 활용
- [ ] 시스템 설정 메뉴에 "총회 문서 템플릿 관리" 링크 추가
  - 라우트: `/admin/system/templates?category=assembly`
- [ ] 권한 체크 (system_admin만 접근)

#### Step 9: 템플릿 관리 컴포넌트

- [ ] `AssemblyTemplateManagement.tsx` (메인 컴포넌트)
- [ ] `AssemblyTemplateList.tsx` (목록)
- [ ] `AssemblyTemplateCard.tsx` (카드)
- [ ] `AssemblyTemplateEditModal.tsx` (편집 모달)
  - FormationAgendaTemplateEditor
  - MemberListTemplateEditor
- [ ] `AssemblyTemplateVersionHistory.tsx` (버전 히스토리)
- [ ] `AssemblyTemplatePreviewModal.tsx` (미리보기)

#### Step 10: 기존 문서 생성 UI 연동

- [ ] `AssemblyDocumentGenerationModal.tsx` 수정
  - 템플릿 기반 기본값 로드
  - API 응답 구조 변경 대응
- [ ] 에디터 컴포넌트 테스트 및 검증

### Phase 5: 테스트 및 배포 (Step 11-12)

#### Step 11: 통합 테스트

- [ ] 템플릿 CRUD 동작 확인
- [ ] 버전 관리 및 롤백 테스트
- [ ] 템플릿 수정 후 문서 생성 테스트
- [ ] PDF 생성 결과 검증

#### Step 12: 문서화 및 배포

- [ ] 시스템 어드민 가이드 업데이트
- [ ] 템플릿 설정 변수 문서화 (예: {fund_name}, {assembly_date})
- [ ] 배포 및 모니터링

---

## 9. 템플릿 변수 시스템

### 9.1 지원 변수

템플릿에서 사용 가능한 동적 변수:

| 변수명                | 설명                   | 예시                        |
| --------------------- | ---------------------- | --------------------------- |
| `{fund_name}`         | 펀드명                 | 프로펠-SNUSV엔젤투자조합1호 |
| `{assembly_date}`     | 총회 개최일 (포맷팅됨) | 2024년 7월 19일             |
| `{assembly_date_raw}` | 총회 개최일 (원본)     | 2024-07-19                  |
| `{index}`             | 의안 번호              | 1, 2, 3, ...                |
| `{title}`             | 의안 제목              | 규약(안) 승인의 건          |

### 9.2 변수 치환 로직

PDF 생성 시 변수 치환:

```typescript
function replaceTemplateVariables(
  template: string,
  variables: Record<string, any>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}
```

사용 예시:

```typescript
const titleTemplate = '{fund_name} 결성총회';
const title = replaceTemplateVariables(titleTemplate, {
  fund_name: '프로펠-SNUSV엔젤투자조합1호',
});
// → "프로펠-SNUSV엔젤투자조합1호 결성총회"
```

---

## 10. 보안 및 권한

### 10.1 권한 레벨

| 역할         | 템플릿 조회 | 템플릿 수정 | 문서 생성 | 문서 조회 |
| ------------ | ----------- | ----------- | --------- | --------- |
| system_admin | ✅          | ✅          | ✅        | ✅        |
| admin        | ❌          | ❌          | ✅        | ✅        |
| user         | ❌          | ❌          | ❌        | ❌        |

### 10.2 API 권한 체크

모든 `/api/system-admin/*` 엔드포인트:

```typescript
// 권한 체크 미들웨어
const user = await getUserFromSession(request);
if (user.role !== 'system_admin') {
  return new Response(JSON.stringify({ error: '권한이 없습니다.' }), {
    status: 403,
  });
}
```

### 10.3 감사 로그

템플릿 변경 시 자동 기록:

- 변경자 (created_by, updated_by)
- 변경 시각 (created_at, updated_at)
- 변경 요약 (change_summary)
- 이전 버전 스냅샷 (template_versions)

---

## 11. 예외 처리 및 에러 핸들링

### 11.1 템플릿 로드 실패

**시나리오:** DB에 템플릿이 없거나 손상된 경우

**대응:**

1. 하드코딩된 기본 템플릿 폴백 (백업용)
2. 에러 로그 기록
3. 시스템 어드민에게 알림

```typescript
async function getActiveTemplateByType(
  type: string,
  fundId: string | null = null
) {
  try {
    const query = db.document_templates
      .select()
      .eq('type', type)
      .eq('is_active', true);

    if (fundId === null) {
      query.is('fund_id', null); // 글로벌 템플릿
    } else {
      query.eq('fund_id', fundId);
    }

    const template = await query.single();

    if (!template) {
      console.error('템플릿 없음, 기본 템플릿 사용');
      return FALLBACK_TEMPLATES[type];
    }

    return template;
  } catch (error) {
    console.error('템플릿 로드 실패:', error);
    return FALLBACK_TEMPLATES[type];
  }
}
```

### 11.2 템플릿 버전 충돌

**시나리오:** 동시에 여러 어드민이 템플릿 수정 시도

**대응:**

1. 낙관적 잠금 (Optimistic Locking) 사용
2. 버전 번호 불일치 시 에러 반환
3. 사용자에게 최신 버전 확인 후 재시도 요청

### 11.3 PDF 생성 실패

**시나리오:** 잘못된 템플릿 설정으로 PDF 생성 오류

**대응:**

1. 상세 에러 메시지 반환
2. 어드민에게 템플릿 검토 요청
3. 이전 버전으로 자동 롤백 옵션 제공

---

## 12. 성능 최적화

### 12.1 템플릿 캐싱

자주 조회되는 활성 템플릿은 메모리 캐싱:

```typescript
const templateCache = new Map<string, DocumentTemplate>();
const CACHE_TTL = 60 * 5; // 5분

async function getCachedTemplate(type: string, fundId: string | null = null) {
  const cacheKey = `${type}_${fundId || 'global'}`;
  const cached = templateCache.get(cacheKey);
  if (cached && cached.cachedAt > Date.now() - CACHE_TTL * 1000) {
    return cached.template;
  }

  const template = await getActiveTemplateByType(type, fundId);
  templateCache.set(cacheKey, { template, cachedAt: Date.now() });
  return template;
}
```

**캐시 무효화:**

- 템플릿 수정 (새 버전 생성 또는 활성화) 시 자동 무효화
- 서버 재시작 시 자동 클리어

### 12.2 버전 히스토리 페이지네이션

버전이 많을 경우 페이지네이션:

```
GET /api/system-admin/assembly-templates/{id}/versions?page=1&limit=10
```

---

## 13. 마이그레이션 전략

### 13.1 기존 시스템에서 템플릿 시스템으로 전환

**단계적 마이그레이션:**

1. `document_templates` 테이블에 `editable` 컬럼 추가
2. 초기 템플릿 데이터 삽입 (현재 하드코딩 내용을 `document_templates`에)
3. 새 코드 배포 (DB 템플릿 우선, 실패 시 하드코딩 폴백)
4. 테스트 및 검증
5. 하드코딩 코드 제거 (Phase 2)

**기존 규약 템플릿과의 호환성:**

- 기존 LPA, Plan 템플릿: `fund_id` 값 있음 (펀드별)
- 조합원 총회 템플릿: `fund_id = NULL` (글로벌)
- 동일 테이블에서 평화롭게 공존 가능

### 13.2 기존 생성된 문서와의 호환성

**기존 문서 (조합원 총회):**

- `template_id`, `template_version`이 NULL (템플릿 도입 전 생성)
- PDF는 이미 생성되어 storage에 저장됨
- 재생성하지 않음, 그대로 유지

**새 문서 (템플릿 도입 후):**

- 템플릿 기반으로 생성
- `template_id`, `template_version` 자동 기록
- 어떤 템플릿으로 생성되었는지 추적 가능

---

## 14. 향후 확장 계획

### 14.1 Phase 2: 추가 기능

- [ ] 템플릿 복사 기능 (새 총회 유형 추가 시 기존 템플릿 복사)
- [ ] 템플릿 내보내기/가져오기 (JSON 파일)
- [ ] 템플릿 미리보기 향상 (실제 펀드 데이터 선택 가능)
- [ ] 템플릿 버전 비교 (Diff 보기)
- [ ] 템플릿 변경 시 영향도 분석 (이 템플릿을 사용하는 문서 수 표시)

### 14.2 Phase 3: 고급 기능

- [ ] 조건부 섹션 (특정 조건에서만 표시)
- [ ] 반복 블록 (동적 개수의 섹션)
- [ ] 커스텀 변수 정의 (시스템 어드민이 새 변수 추가)
- [ ] 템플릿 상속 (공통 템플릿 + 특화 템플릿)

---

## 15. 주의사항

### 15.1 운영 시 주의점

1. **템플릿 수정 전 백업**: 롤백 가능하지만, 중요 변경 전 수동 백업 권장
2. **미리보기 필수**: 수정 후 반드시 미리보기로 검증
3. **점진적 변경**: 한 번에 많은 내용 변경 지양
4. **변경 요약 작성**: 나중에 히스토리 추적 용이

### 15.2 개발 시 주의점

1. **폴백 메커니즘**: DB 조회 실패 시 기본값 제공
2. **타입 안정성**: 템플릿 JSON 스키마 검증
3. **에러 처리**: 사용자 친화적 에러 메시지
4. **성능 모니터링**: 템플릿 조회 및 PDF 생성 시간 추적

---

## 16. 참고 자료

### 16.1 기존 코드 참조

- **규약 템플릿 시스템**: `lib/admin/fund-documents.ts` (유사한 버전 관리 패턴)
- **템플릿 편집 UI**: `components/admin/TemplateEditModal.tsx`
- **PDF 생성**: `lib/pdf/lpa-generator.ts`

### 16.2 관련 문서

- `design_mds/ASSEMBLY_FEATURE_DESIGN.md`: 조합원 총회 기능 전체 설계
- `DOCUMENT_VERSIONING.md`: 문서 버전 관리 가이드

---

## 17. 마무리

이 설계안은 조합원 총회 문서 템플릿을 코드에서 분리하여 DB로 관리하고, 시스템 어드민이 쉽게 수정할 수 있도록 하는 시스템을 구축합니다.

**핵심 목표 달성:**

- ✅ 템플릿 내용 DB 저장 (기존 `document_templates` 테이블 활용)
- ✅ 시스템 어드민 전용 관리 UI
- ✅ 일반 어드민은 기존과 동일한 UX
- ✅ 템플릿 버전 관리 및 롤백 (기존 시스템 방식 재사용)
- ✅ 확장 가능한 구조

**기존 시스템과의 통합:**

- ✅ 새 테이블 생성 불필요
- ✅ 기존 규약 템플릿 시스템과 공존
- ✅ 버전 관리 방식 동일
- ✅ API 경로 통합
- ✅ **content/context 분리로 문서 완벽 복원 가능**

**주요 설계 결정:**

1. **기존 테이블 재사용**:
   - `document_templates`에 `editable` 컬럼 추가
   - `assembly_documents`에 `context` 컬럼 추가
2. **템플릿 구조**: 규약 템플릿 패턴을 그대로 따름
   - `content` JSONB: 레이블, 구조(테이블 컬럼 등), 편집 가능한 기본값 저장
   - PDF 스타일: `lib/pdf/*-config.ts` 파일에서 관리 (폰트, 크기, 간격 등)
   - 규약의 `tableConfig`, `appendix` 레이블과 동일한 방식
3. **문서 저장 구조**: `fund_documents` 패턴 따름
   - `assembly_documents.content`: 사용자 편집 데이터 (의장, 의안 등)
   - `assembly_documents.context`: 자동 생성 데이터 (펀드명, 총회일시, 조합원 목록 등)
   - content + context = 원본 문서 완벽 복원
4. **버전 관리**: 기존 방식 그대로 (레코드 단위 버전, is_active로 활성 버전 관리)

5. **fund_id = NULL**: 조합원 총회 템플릿은 글로벌 템플릿으로 관리

**다음 단계:**

1. 설계안 검토 및 피드백
2. 데이터베이스 마이그레이션 작성 (`editable` 컬럼 추가)
3. 초기 템플릿 데이터 삽입 스크립트 작성
4. 단계별 구현 시작

질문이나 수정 사항이 있으면 말씀해 주세요!
