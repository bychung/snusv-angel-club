# 조합원 총회 기능 설계안

## 1. 개요

펀드 관리 페이지에 '조합원 총회' 탭을 추가하여 총회 관련 문서 생성 및 발송 기능을 제공합니다.

### 1.1 구현 범위 (Phase 1)

- 총회 종류: **결성총회만 구현** (향후 임시총회, 정기총회, 해산/청산총회 추가 예정)
- 문서 종류: **조합원 명부, 결성총회 의안 2가지만 구현** (향후 추가 문서 확장 예정)
- 발송 방법: 이메일 발송

---

## 2. UI/UX 설계

### 2.1 탭 추가

**위치**: `FundDetailManager` 컴포넌트 내 기존 탭 목록에 추가

기존 탭:

- 기본 정보 (info)
- 공통 문서 (documents)
- 투자확인서 (certificates)
- 문서 생성 (document-generation)

**신규 탭**:

- **조합원 총회 (assembly)** ← 추가

### 2.2 조합원 총회 탭 구성

#### 2.2.1 초기 화면 (총회 목록이 없을 때)

```
┌─────────────────────────────────────────────┐
│  조합원 총회 관리                              │
├─────────────────────────────────────────────┤
│                                             │
│  📋 총회를 생성하여 관련 문서를 작성하고       │
│     조합원들에게 발송할 수 있습니다.           │
│                                             │
│  [+ 총회 생성하기]                            │
│                                             │
└─────────────────────────────────────────────┘
```

#### 2.2.2 총회 목록이 있을 때

```
┌─────────────────────────────────────────────────────┐
│  조합원 총회 관리                   [+ 총회 생성하기]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 결성총회                           2024.07.19 │   │
│  │                                               │   │
│  │ 상태: 작성 중 / 완료 / 발송 완료               │   │
│  │ 생성된 문서: 2/9                               │   │
│  │   ✓ 조합원 명부                                │   │
│  │   ✓ 결성총회 의안                              │   │
│  │   ⊙ 결성총회 공문 (미생성)                      │   │
│  │                                               │   │
│  │ [계속 작성] [문서 보기] [이메일 발송] [삭제]     │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2.3 총회 생성 팝업 - Step 1: 총회 종류 선택

```
┌─────────────────────────────────────────────┐
│  총회 생성                            [1/N]   │
├─────────────────────────────────────────────┤
│                                             │
│  총회 종류를 선택하세요                        │
│                                             │
│  ┌─────────────────────┐                    │
│  │  ● 결성총회          │ (선택 가능)         │
│  │  ○ 임시총회          │ (비활성화)          │
│  │  ○ 정기총회          │ (비활성화)          │
│  │  ○ 해산/청산총회      │ (비활성화)          │
│  └─────────────────────┘                    │
│                                             │
│  ⓘ 현재는 결성총회만 생성 가능합니다.           │
│     추후 다른 총회 유형이 추가될 예정입니다.     │
│                                             │
│                      [취소]  [다음: 문서 생성] │
└─────────────────────────────────────────────┘
```

### 2.4 총회 생성 팝업 - Step 2: 문서 생성

결성총회 선택 시 생성할 문서 목록을 단계별로 생성합니다.

#### 2.4.1 조합원 명부 생성 (자동 생성 타입)

```
┌─────────────────────────────────────────────┐
│  결성총회 문서 생성                    [2/10] │
├─────────────────────────────────────────────┤
│                                             │
│  📄 조합원 명부                              │
│                                             │
│  이 문서는 현재 펀드의 조합원 정보를 바탕으로  │
│  자동으로 생성됩니다.                         │
│                                             │
│  [미리보기 (PDF)]                            │
│                                             │
│  ─────────────────────────────              │
│  조합원 명부 미리보기 (임베드 또는 새창)       │
│  (조합원 리스트 테이블 표시)                  │
│  ─────────────────────────────              │
│                                             │
│                       [이전]  [저장 후 다음] │
└─────────────────────────────────────────────┘
```

**저장 후 다음 클릭 시**:

- DB에 문서 저장
- PDF 생성 및 저장
- 다음 문서 생성 단계로 이동

#### 2.4.2 결성총회 의안 생성 (편집 가능 타입)

```
┌─────────────────────────────────────────────┐
│  결성총회 문서 생성                    [3/10] │
├─────────────────────────────────────────────┤
│                                             │
│  📄 결성총회 의안                            │
│                                             │
│  의안 내용을 검토하고 필요시 수정하세요.       │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ 의장: [편집 가능]                      │  │
│  │                                      │  │
│  │                                      │  │
│  │ 부의안건:                           │  │
│  │                                      │  │
│  │ 제1호 의안: 규약(안) 승인의 건          │  │
│  │ [내용 편집 가능]                       │  │
│  │                                      │  │
│  │ 제2호 의안: 사업계획 승인의 건          │  │
│  │ [내용 편집 가능]                       │  │
│  │                                      │  │
│  │ [+ 의안 추가]  [- 의안 삭제]          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [미리보기 (PDF)]                            │
│                                             │
│                       [이전]  [저장 후 다음] │
└─────────────────────────────────────────────┘
```

#### 2.4.3 모든 문서 생성 완료

```
┌─────────────────────────────────────────────┐
│  결성총회 문서 생성 완료                      │
├─────────────────────────────────────────────┤
│                                             │
│  ✅ 모든 문서가 생성되었습니다!               │
│                                             │
│  생성된 문서:                                │
│  • 조합원 명부                               │
│  • 결성총회 의안                             │
│                                             │
│  다음 단계:                                  │
│  • 총회 목록에서 문서를 확인할 수 있습니다     │
│  • 조합원들에게 이메일로 발송할 수 있습니다    │
│                                             │
│                            [닫기]  [발송하기] │
└─────────────────────────────────────────────┘
```

### 2.5 이메일 발송 팝업

```
┌─────────────────────────────────────────────┐
│  총회 문서 이메일 발송                        │
├─────────────────────────────────────────────┤
│                                             │
│  발송 대상: 결성총회 (2024.07.19)            │
│                                             │
│  수신자: 23명의 조합원                       │
│  ┌──────────────────────────────────────┐  │
│  │ ☑ 전체 선택                           │  │
│  │ ☑ 프로펠벤처스(주) (곽준영)             │  │
│  │ ☑ 김동재                              │  │
│  │ ☑ 김병우                              │  │
│  │ ... (스크롤)                          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  발송 내용:                                  │
│  ┌──────────────────────────────────────┐  │
│  │ 제목: [FUND명] 결성총회 안내            │  │
│  │                                      │  │
│  │ 본문: (편집 가능)                      │  │
│  │ 안녕하세요, 조합원 여러분.              │  │
│  │ 결성총회와 관련된 문서를 첨부합니다...   │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  첨부 문서:                                  │
│  ☑ 조합원 명부.pdf                          │
│  ☑ 결성총회 의안.pdf                        │
│                                             │
│                              [취소]  [발송] │
└─────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 설계

### 3.1 신규 테이블: `assemblies` (조합원 총회)

```sql
CREATE TYPE assembly_type AS ENUM (
  'formation',      -- 결성총회
  'special',        -- 임시총회
  'regular',        -- 정기총회
  'dissolution'     -- 해산/청산총회
);

CREATE TYPE assembly_status AS ENUM (
  'draft',          -- 작성 중
  'completed',      -- 문서 생성 완료
  'sent'            -- 발송 완료
);

CREATE TABLE IF NOT EXISTS assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  type assembly_type NOT NULL,
  status assembly_status DEFAULT 'draft' NOT NULL,
  assembly_date DATE NOT NULL,                    -- 총회 개최일
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assemblies_fund_id ON assemblies(fund_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_type ON assemblies(type);
CREATE INDEX IF NOT EXISTS idx_assemblies_status ON assemblies(status);
```

### 3.2 신규 테이블: `assembly_documents` (총회 문서)

```sql
-- 문서 타입은 TEXT로 관리 (향후 다양한 문서 타입 추가 용이)
-- 예시 타입들:
-- 결성총회: 'formation_member_list', 'formation_agenda', 'formation_official_letter',
--          'formation_minutes', 'fund_registration_application', 'investment_certificate',
--          'seal_registration', 'member_consent', 'personal_info_consent'
-- 임시총회: 'special_agenda', 'special_minutes', ...
-- 정기총회: 'regular_agenda', 'regular_minutes', ...
-- 해산/청산총회: 'dissolution_agenda', 'dissolution_minutes', ...

CREATE TABLE IF NOT EXISTS assembly_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,                          -- 문서 타입 (자유 형식)

  -- 문서 내용 (JSON 형태로 저장, 편집된 내용 저장)
  content JSONB,

  -- 템플릿 정보
  template_id UUID REFERENCES document_templates(id),
  template_version TEXT,

  -- PDF 저장 경로
  pdf_storage_path TEXT,

  -- 생성 정보
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 한 총회에서 같은 타입의 문서는 하나만
  UNIQUE(assembly_id, type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assembly_documents_assembly_id ON assembly_documents(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_documents_type ON assembly_documents(type);
```

### 3.3 신규 테이블: `assembly_emails` (총회 이메일 발송 기록)

```sql
CREATE TYPE assembly_email_status AS ENUM (
  'pending',        -- 발송 대기
  'sending',        -- 발송 중
  'sent',           -- 발송 완료
  'failed'          -- 발송 실패
);

CREATE TABLE IF NOT EXISTS assembly_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,

  -- 발송 정보
  recipient_ids UUID[] NOT NULL,          -- 수신자 profile IDs
  recipient_emails TEXT[] NOT NULL,       -- 수신자 이메일 목록

  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- 첨부 문서
  attached_document_ids UUID[] NOT NULL,  -- assembly_documents IDs

  -- 발송 상태
  status assembly_email_status DEFAULT 'pending' NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- 발송자
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assembly_emails_assembly_id ON assembly_emails(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_emails_status ON assembly_emails(status);
```

---

## 4. API 설계

### 4.1 총회 관리 API

#### 4.1.1 총회 목록 조회

```
GET /api/admin/funds/{fundId}/assemblies
Response: {
  assemblies: [
    {
      id: string,
      type: 'formation' | 'special' | 'regular' | 'dissolution',
      status: 'draft' | 'completed' | 'sent',
      assembly_date: string,
      document_count: number,        // 생성된 문서 수
      total_document_count: number,  // 해당 총회 유형의 전체 문서 수
      created_at: string
    }
  ]
}
```

#### 4.1.2 총회 생성

```
POST /api/admin/funds/{fundId}/assemblies
Body: {
  type: 'formation',
  assembly_date: '2024-07-19'
}
Response: {
  id: string,
  ...
}
```

#### 4.1.3 총회 상세 조회

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}
Response: {
  assembly: {
    id: string,
    type: string,
    status: string,
    assembly_date: string,
    documents: [
      {
        id: string,
        type: string,
        pdf_storage_path: string,
        generated_at: string
      }
    ]
  }
}
```

#### 4.1.4 총회 삭제

```
DELETE /api/admin/funds/{fundId}/assemblies/{assemblyId}
```

### 4.2 문서 생성 API

#### 4.2.1 문서 생성 정보 조회 (다음에 생성할 문서 정보)

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document
Response: {
  document_type: 'formation_member_list',
  requires_input: false,        // 사용자 입력이 필요한지 여부
  template: {...},              // 템플릿 정보 (입력 필요 시)
  preview_data: {...},          // 미리보기 데이터
  input_schema: {...}           // 필요한 입력 필드 스키마 (입력 필요 시)
}
```

#### 4.2.2 자동 생성 문서 생성 (조합원 명부)

```
POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate
Body: {
  type: 'formation_member_list'
}
Response: {
  document: {
    id: string,
    type: string,
    pdf_storage_path: string,
    pdf_url: string              // PDF 다운로드 URL
  }
}
```

#### 4.2.3 편집 가능 문서 생성 (결성총회 의안)

```
POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate
Body: {
  type: 'formation_agenda',
  content: {                     // 편집된 내용
    chairman: '업무집행조합원 프로펠벤처스 대표이사 곽준영',           // 의장
    agendas: [
      {
        index: 1,
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.'
      },
      {
        index: 2,
        title: '사업계획 승인의 건',
        content: '당 조합은 유망한 중소벤처기업에 투자하여...'
      }
    ]
  }
}
Response: {
  document: {
    id: string,
    type: string,
    pdf_storage_path: string,
    pdf_url: string
  }
}
```

#### 4.2.4 문서 미리보기

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/{documentId}/preview
Response: PDF Buffer
```

#### 4.2.5 문서 다운로드

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/{documentId}/download
Response: PDF Buffer
```

### 4.3 이메일 발송 API

#### 4.3.1 발송 미리보기 (수신자 목록 조회)

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/preview
Response: {
  recipients: [
    {
      id: string,
      name: string,
      email: string
    }
  ],
  subject: string,              // 기본 제목
  body: string,                 // 기본 본문 템플릿
  attachments: [
    {
      id: string,
      type: string,
      file_name: string
    }
  ]
}
```

#### 4.3.2 이메일 발송

```
POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/send
Body: {
  recipient_ids: string[],      // 선택된 수신자 IDs
  subject: string,              // 편집된 제목
  body: string,                 // 편집된 본문
  document_ids: string[]        // 첨부할 문서 IDs
}
Response: {
  email_id: string,
  status: 'pending' | 'sending',
  message: '이메일 발송이 시작되었습니다.'
}
```

#### 4.3.3 발송 상태 조회

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/email/status
Response: {
  emails: [
    {
      id: string,
      status: 'pending' | 'sending' | 'sent' | 'failed',
      recipient_count: number,
      sent_at: string,
      error_message: string
    }
  ]
}
```

---

## 5. 컴포넌트 구조

```
components/admin/
├── AssemblyManagement.tsx              # 조합원 총회 탭 메인 컴포넌트
├── AssemblyList.tsx                    # 총회 목록 표시
├── AssemblyCard.tsx                    # 개별 총회 카드
├── AssemblyCreationModal.tsx           # 총회 생성 모달 (다단계)
│   ├── AssemblyTypeSelector.tsx        # Step 1: 총회 종류 선택
│   └── AssemblyDocumentGenerator.tsx   # Step 2~N: 문서 생성
│       ├── MemberListStep.tsx          # 조합원 명부 생성 단계
│       └── AgendaEditorStep.tsx        # 의안 편집 단계
├── AssemblyEmailModal.tsx              # 이메일 발송 모달
└── AssemblyDocumentViewer.tsx          # 문서 미리보기/다운로드

lib/admin/
├── assemblies.ts                       # 총회 관리 함수들
└── assembly-documents.ts               # 총회 문서 생성 함수들

lib/pdf/
├── member-list-generator.ts            # 조합원 명부 PDF 생성
└── formation-agenda-generator.ts       # 결성총회 의안 PDF 생성

lib/email/
└── assembly-notifications.ts           # 총회 이메일 발송

app/api/admin/funds/[fundId]/assemblies/
├── route.ts                            # GET (목록), POST (생성)
├── [assemblyId]/
│   ├── route.ts                        # GET (상세), DELETE (삭제)
│   ├── next-document/
│   │   └── route.ts                    # GET (다음 문서 정보)
│   ├── documents/
│   │   ├── generate/
│   │   │   └── route.ts                # POST (문서 생성)
│   │   └── [documentId]/
│   │       ├── preview/
│   │       │   └── route.ts            # GET (미리보기)
│   │       └── download/
│   │           └── route.ts            # GET (다운로드)
│   └── email/
│       ├── preview/
│       │   └── route.ts                # GET (발송 미리보기)
│       ├── send/
│       │   └── route.ts                # POST (발송)
│       └── status/
│           └── route.ts                # GET (발송 상태)
```

---

## 6. 문서 타입 정의

### 6.1 조합원 명부 (자동 생성)

**데이터 소스**:

- `funds` 테이블: 펀드명, GP 정보
- `fund_members` 테이블: 조합원 정보
- `profiles` 테이블: 조합원 상세 정보 (이름, 생년월일/사업자등록번호, 주소, 연락처 등)

**PDF 레이아웃**:

- 상단: 제목 "조합원 명부"
- 중단: 테이블 형태로 조합원 정보 나열
  - 번호, 조합원명(가나다순), 생년월일(사업자등록번호), 주소, 연락처, 출자좌수
- 하단:
  - 날짜 (문서 생성일)
  - 펀드명 (예: "프로펠-SNUSV엔젤투자조합1호")
  - 업무집행조합원 명단 (GP 리스트)
  - 서명란

### 6.2 결성총회 의안 (편집 가능)

**기본 템플릿**:

```json
{
  "title": "${fundName} 결성총회",
  "date": "${assemblyDate}",
  "chairman": "", // 의장 (편집 가능)
  "agendas": [
    {
      "index": 1,
      "title": "규약(안) 승인의 건",
      "content": "첨부한 규약 참조 부탁드립니다."
    },
    {
      "index": 2,
      "title": "사업계획 승인의 건",
      "content": "당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고..."
    }
  ]
}
```

**편집 가능 항목**:

- **의장** (chairman): 텍스트 입력
- **의안 제목** (agendas[].title): 각 의안의 제목
- **의안 내용** (agendas[].content): 각 의안의 내용
- **의안 추가/삭제**: 동적으로 의안 개수 조정 가능

**자동 생성 항목**:

- **제목** (title): 펀드명을 포함한 총회 제목
- **날짜** (date): 총회 개최일

**PDF 레이아웃**:

- 상단: 제목 (예: "프로펠-SNUSV엔젤투자조합1호 결성총회")
- 날짜 및 기본 정보:
  - 일시: 총회 개최일
  - 의장: 편집된 의장명
- 본문:
  - '부의안건' 텍스트
  - 각 의안별로 섹션 구분
  - "제N호 의안: [제목]"
  - 의안 내용
- 하단: 작성일, 펀드명

**재사용성 고려사항**:

- 이 템플릿 구조는 결성총회뿐만 아니라 임시총회, 정기총회 등에서도 동일하게 사용 가능
- 의안의 기본 내용만 총회 유형에 따라 다르게 설정
- 동일한 PDF 생성 로직 재사용 가능

---

## 7. 상태 관리 흐름

### 7.1 총회 생성 흐름

```
1. 사용자: "총회 생성하기" 클릭
2. 모달: 총회 종류 선택 (현재는 결성총회만 가능)
3. API: POST /assemblies → assembly 레코드 생성 (status: 'draft')
4. 모달: 문서 생성 단계로 이동
5. 각 문서별로:
   - 조합원 명부: 데이터 로드 → 미리보기 → 저장
   - 결성총회 의안: 템플릿 로드 → 의장/의안 편집 → 미리보기 → 저장
6. 문서 저장 시마다:
   - API: POST /documents/generate
   - PDF 생성 및 storage 저장
   - assembly_documents 레코드 생성
7. 모든 문서 생성 완료:
   - assembly.status → 'completed'
8. 모달 닫기
9. 총회 목록에 새로운 총회 카드 표시
```

### 7.2 이메일 발송 흐름

```
1. 사용자: 총회 카드에서 "이메일 발송" 클릭
2. API: GET /email/preview → 수신자 목록, 기본 템플릿 로드
3. 모달: 수신자 선택, 제목/본문 편집
4. 사용자: "발송" 클릭
5. API: POST /email/send
   - assembly_emails 레코드 생성 (status: 'pending')
   - 백그라운드 작업 시작 (각 수신자에게 이메일 발송)
6. 백그라운드 작업:
   - 각 수신자에게 이메일 발송 (GmailService 사용)
   - 첨부 파일: assembly_documents의 PDF
   - 발송 완료 시 status → 'sent'
   - 실패 시 status → 'failed', error_message 저장
7. 발송 완료 후:
   - assembly.status → 'sent'
8. 모달 닫기
9. 총회 카드 상태 업데이트 (발송 완료 표시)
```

---

## 8. 기술 스택 및 라이브러리

### 8.1 사용 기술

- **Frontend**: Next.js App Router, React, TypeScript
- **UI**: Shadcn UI, Tailwind CSS
- **State Management**: React Hooks (useState, useEffect)
- **PDF 생성**: PDFKit (기존 LPA generator 패턴 재사용)
- **이메일 발송**: Gmail API (기존 GmailService 사용)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage

### 8.2 재사용 가능한 기존 코드

1. **PDF 생성 패턴**

   - `lib/pdf/lpa-generator.ts` 패턴 참고
   - 한글 폰트 처리 로직 재사용
   - 테이블 렌더링 로직 재사용 (조합원 명부)

2. **문서 관리 패턴**

   - `lib/admin/fund-documents.ts` 패턴 참고
   - 버전 관리, 활성 문서 관리 로직 유사

3. **이메일 발송**

   - `lib/email/gmail.ts` 의 `GmailService` 클래스 사용
   - `lib/email/inquiry-notifications.ts` 패턴 참고

4. **모달 UI**
   - 기존 `TemplateEditModal.tsx` 다단계 폼 패턴 참고
   - `PDFPreviewModal.tsx` PDF 미리보기 패턴 재사용

---

## 9. 구현 순서 (Phase 1)

### Step 1: 데이터베이스 마이그레이션

- [ ] `assemblies` 테이블 생성
- [ ] `assembly_documents` 테이블 생성
- [ ] `assembly_emails` 테이블 생성
- [ ] Enum 타입들 생성

### Step 2: TypeScript 타입 정의

- [ ] `types/assemblies.ts` 생성
- [ ] Database 타입 확장

### Step 3: 백엔드 API 구현

- [ ] 총회 CRUD API
- [ ] 문서 생성 API (조합원 명부, 결성총회 의안)
- [ ] 이메일 발송 API

### Step 4: PDF 생성기 구현

- [ ] `member-list-generator.ts` (조합원 명부)
  - 펀드명, GP 정보, 조합원 테이블, 서명란 포함
- [ ] `formation-agenda-generator.ts` (결성총회 의안)
  - 의장, 진행순서, 부의안건, 의안 본문 포함
  - 재사용 가능한 구조로 설계 (다른 총회 유형에서도 활용)

### Step 5: 프론트엔드 UI 구현

- [ ] `AssemblyManagement.tsx` (메인 탭)
- [ ] `AssemblyList.tsx` & `AssemblyCard.tsx`
- [ ] `AssemblyCreationModal.tsx` (다단계 모달)
- [ ] `AssemblyEmailModal.tsx` (이메일 발송)

### Step 6: 통합 및 테스트

- [ ] 전체 플로우 테스트
- [ ] 이메일 발송 테스트
- [ ] PDF 생성 테스트

---

## 10. 향후 확장 계획 (Phase 2+)

### 10.1 추가 총회 유형

- 임시총회 (special)
- 정기총회 (regular)
- 해산/청산총회 (dissolution)

### 10.2 추가 문서 유형

결성총회:

- 결성총회 공문
- 결성총회 의사록
- 개인투자조합등록신청서
- 출자증표
- 조합인감등록부
- 조합원동의서
- 개인정보동의서

기타 총회:

- 각 총회별 고유 문서들

### 10.3 기능 개선

- [ ] 문서 재생성 기능
- [ ] 문서 수정 이력 관리
- [ ] 이메일 발송 이력 상세 조회
- [ ] 개별 이메일 재발송 기능
- [ ] 총회 복사 기능
- [ ] 총회 템플릿 관리

### 10.4 알림 기능

- [ ] 총회 일정 리마인더
- [ ] 발송 완료 알림
- [ ] 발송 실패 알림

---

## 11. 주의사항 및 고려사항

### 11.1 보안

- 관리자 권한 검증 필수 (모든 API에서)
- PDF 다운로드 URL 임시 토큰 발급 고려
- 이메일 발송 시 민감 정보 로깅 주의

### 11.2 성능

- 다수의 조합원에게 이메일 발송 시 백그라운드 작업 필요
- PDF 생성 시 캐싱 고려 (동일 내용이면 재생성하지 않음)
- 대용량 PDF의 경우 스트리밍 다운로드 고려

### 11.3 에러 처리

- 문서 생성 실패 시 부분 저장 허용 (중간 저장)
- 이메일 발송 실패 시 재시도 로직
- 네트워크 오류 시 사용자 피드백

### 11.4 UX

- 문서 생성 중 로딩 인디케이터
- 진행 상황 표시 (N/M 문서 생성 중)
- 이메일 발송 중 모달 닫기 방지
- 발송 완료 후 알림

---

## 12. 참고 이미지

### 12.1 조합원 명부

첨부된 이미지 참조 (조합원 리스트 테이블)

### 12.2 결성총회 의안

첨부된 이미지 참조 (의안별 섹션 구조)

---

이 설계안을 바탕으로 단계별로 구현을 진행하면 됩니다.
구현 과정에서 추가 질문이나 수정 사항이 있으면 말씀해 주세요!
