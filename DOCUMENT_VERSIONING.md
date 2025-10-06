# 문서 버전 관리 시스템

## 개요

조합 규약(LPA) 및 결성계획서 등의 문서 템플릿을 버전별로 관리하고, 생성된 문서의 이력을 추적하는 시스템입니다.

## 주요 기능

### 1. 템플릿 버전 관리

- 문서 타입별로 여러 버전의 템플릿 관리
- 활성/비활성 상태로 현재 사용 중인 템플릿 제어
- 템플릿 변경 이력 추적

### 2. 문서 생성 기록

- 펀드별로 생성된 문서 기록
- 어떤 템플릿 버전으로 생성되었는지 추적
- 재생성을 위한 컨텍스트 저장

## 데이터베이스 스키마

### `document_templates` 테이블

```sql
- id: UUID (PK)
- type: VARCHAR(50) - 문서 타입 ('lpa', 'plan' 등)
- version: VARCHAR(20) - 버전 ('1.0.0', '1.1.0')
- content: JSONB - 템플릿 전체 구조
- is_active: BOOLEAN - 활성 여부
- description: TEXT - 변경 사항 설명
- brand: VARCHAR(50)
- created_at: TIMESTAMPTZ
- created_by: UUID (FK -> profiles)
```

### `fund_documents` 테이블

```sql
- id: UUID (PK)
- fund_id: UUID (FK -> funds)
- type: VARCHAR(50) - 문서 타입
- template_id: UUID (FK -> document_templates)
- template_version: VARCHAR(20)
- processed_content: JSONB - 변수 치환 완료된 최종 내용
- generation_context: JSONB - 재생성용 컨텍스트
- pdf_storage_path: TEXT
- brand: VARCHAR(50)
- generated_at: TIMESTAMPTZ
- generated_by: UUID (FK -> profiles)
```

## API 엔드포인트

### 템플릿 관리

#### 1. 특정 타입의 모든 템플릿 조회

```
GET /api/admin/templates/types/:type

Response:
{
  "templates": [
    {
      "id": "uuid",
      "type": "lpa",
      "version": "1.0.0",
      "is_active": true,
      "description": "기본 규약 템플릿",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. 활성 템플릿 조회

```
GET /api/admin/templates/types/:type/active

Response:
{
  "template": {
    "id": "uuid",
    "type": "lpa",
    "version": "1.0.0",
    "content": { ... },
    "is_active": true
  }
}
```

#### 3. 템플릿 활성화

```
POST /api/admin/templates/:templateId/activate

Response:
{
  "template": { ... },
  "message": "템플릿이 활성화되었습니다."
}
```

### 문서 관리

#### 1. 펀드 문서 조회

```
GET /api/admin/funds/:fundId/documents?type=lpa

Response:
{
  "document": {
    "id": "uuid",
    "fund_id": "uuid",
    "type": "lpa",
    "template_version": "1.0.0",
    "generated_at": "2025-01-01T00:00:00Z"
  }
}
```

#### 2. LPA 생성 (수정됨)

```
POST /api/admin/funds/:fundId/documents/lpa/generate

- 기존과 동일하게 PDF 다운로드
- 추가로 DB에 문서 생성 기록 저장
```

## 설치 및 초기 설정

### 1. 마이그레이션 실행

```bash
# Supabase 마이그레이션 적용
# 마이그레이션 파일: supabase/migrations/041_add_document_versioning.sql
```

### 2. 기존 템플릿 마이그레이션

```bash
# 기존 JSON 템플릿을 DB로 마이그레이션
npx tsx scripts/migrate-templates-to-db.ts
```

이 스크립트는:

- `template/lpa-template.json` → DB로 마이그레이션
- `template/plan-template.json` → DB로 마이그레이션
- 첫 번째 템플릿을 자동으로 활성화

### 3. 동작 확인

```bash
# 템플릿이 정상적으로 등록되었는지 확인
curl http://localhost:3000/api/admin/templates/types/lpa
```

## 사용 흐름

### 템플릿 버전 업데이트 시나리오

1. **새 템플릿 버전 생성**

   ```typescript
   // lib/admin/document-templates.ts
   await createTemplate({
     type: 'lpa',
     version: '1.1.0',
     content: newTemplateContent,
     description: '제27조 성과보수 조항 수정',
     isActive: false, // 검토 후 활성화
   });
   ```

2. **검토 후 활성화**

   ```bash
   POST /api/admin/templates/:templateId/activate
   ```

3. **이후 생성되는 모든 문서는 새 템플릿 사용**
   - `generate/route.ts`가 자동으로 활성 템플릿 사용
   - 기존 문서는 영향 없음 (각자의 버전 유지)

### 문서 재생성

```typescript
// 특정 펀드의 기존 문서를 현재 활성 템플릿으로 재생성
POST /api/admin/funds/:fundId/documents/lpa/generate
```

## 헬퍼 함수

### 템플릿 관리 (`lib/admin/document-templates.ts`)

- `getActiveTemplate(type)` - 활성 템플릿 조회
- `getTemplatesByType(type)` - 타입별 모든 버전 조회
- `getTemplateById(id)` - ID로 조회
- `activateTemplate(id)` - 템플릿 활성화
- `createTemplate(params)` - 새 템플릿 생성
- `updateTemplate(id, updates)` - 템플릿 수정

### 문서 관리 (`lib/admin/fund-documents.ts`)

- `getFundDocument(fundId, type)` - 펀드 문서 조회
- `getFundDocuments(fundId)` - 펀드의 모든 문서 조회
- `saveFundDocument(params)` - 문서 생성/업데이트
- `deleteFundDocument(id)` - 문서 삭제

## 향후 확장 (Phase 2)

- 조건부 섹션 지원
- 섹션 컴포지션
- 관리자 UI (템플릿 편집, 히스토리 보기, Diff 보기)
- 벌크 재생성 기능

## 주의사항

1. **템플릿 삭제 금지**: 템플릿은 삭제하지 않고 비활성화만 사용
2. **버전 규칙**: 시맨틱 버저닝 사용 (`1.0.0`, `1.1.0`, `2.0.0`)
3. **활성 템플릿**: 각 타입당 1개의 활성 템플릿만 유지
4. **재생성 영향도**: 템플릿 변경 시 영향받는 펀드 수 확인 후 진행
