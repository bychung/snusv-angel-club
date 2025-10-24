# 조합원 명부 독립 문서화 기획

## 1. 개요

### 배경

- 현재 조합원 명부는 총회 문서 생성의 일부로만 생성 가능
- 조합원 명부는 총회와 관계없이 언제든 필요할 수 있는 독립적인 문서
- 규약(LPA), 규약동의서처럼 독립적인 문서 생성 기능으로 분리 필요

### 목표

- 조합원 명부를 총회에서 분리하여 독립적인 문서 생성 기능으로 전환
- 기존 생성 로직은 그대로 유지 (리팩토링 없음)
- UI/UX만 변경하여 "문서 생성" 탭에서 관리
- 규약/규약동의서와 동일한 사용자 경험 제공

### 범위

- ✅ 조합원 명부를 독립 문서로 분리
- ✅ "문서 생성" 탭에 새로운 섹션 추가
- ✅ 버전 관리, 미리보기, 다운로드, 삭제 기능 제공
- ❌ 총회 문서 생성 로직 변경 없음
- ❌ 기존 생성 로직 리팩토링 없음

## 2. 현재 구조 분석

### 2.1 조합원 명부 생성 흐름 (현재)

```
총회 생성 → 문서 생성 모달 → 조합원 명부 생성 → Storage 저장 → DB 저장
```

**파일 위치:**

- 생성 로직: `lib/admin/assembly-documents.ts` → `generateMemberListBuffer()`, `generateMemberListPDF()`
- PDF 생성: `lib/pdf/member-list-generator.ts` → `generateMemberListPDF()`
- UI 컴포넌트: `components/admin/AssemblyMemberListEditor.tsx`
- API 엔드포인트:
  - `POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate`
  - `POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/save`

**생성 요구사항:**

- 필수 입력: `fund_id`, `assembly_date`
- 자동 수집 데이터: 펀드 정보, GP 정보, 조합원 정보

### 2.2 규약/규약동의서 구조 (참고 대상)

```
문서 생성 탭 → 생성 버튼 → PDF 생성 → Storage 저장 → DB 저장
```

**파일 위치:**

- 규약 섹션: `components/admin/DocumentGenerationSection.tsx`
- 규약동의서 섹션: `components/admin/lpa-consent-form/LpaConsentFormSection.tsx`
- API 엔드포인트:
  - `POST /api/admin/funds/{fundId}/generated-documents/lpa/generate`
  - `POST /api/admin/funds/{fundId}/generated-documents/lpa-consent-form/generate`
  - `GET /api/admin/funds/{fundId}/generated-documents/lpa-consent-form`
  - `GET /api/admin/funds/{fundId}/generated-documents/lpa-consent-form/diff`
  - `GET /api/admin/funds/{fundId}/generated-documents/lpa-consent-form/{id}/download`
  - `DELETE /api/admin/funds/{fundId}/generated-documents/lpa-consent-form/{id}`

**특징:**

- 독립적인 버전 관리
- 미리보기 기능
- Diff 확인 (규약동의서)
- 다운로드 및 삭제 기능

## 3. 설계

### 3.1 데이터베이스 변경

**신규 테이블 필요 여부: ❌**

기존 `generated_documents` 테이블 활용:

- 이미 `type` 필드에 다양한 문서 타입 저장 가능
- `member_list` 타입 추가하여 사용

**스키마:**

```sql
-- 기존 테이블 활용 (변경 없음)
generated_documents {
  id: uuid
  fund_id: uuid (FK)
  type: text -- 'lpa', 'lpa_consent_form', 'member_list' 등
  content: jsonb -- 템플릿 구조 (조합원 명부는 null 또는 템플릿 정보만)
  context: jsonb -- 생성 시점 스냅샷 (조합원 정보)
  version: text
  template_id: uuid (nullable)
  pdf_storage_path: text
  generated_by: uuid (FK)
  generated_at: timestamp
  created_at: timestamp
  updated_at: timestamp
  brand: text
}
```

**context 구조 (조합원 명부):**

```json
{
  "fund_name": "펀드명",
  "assembly_date": "2024-01-15", // 기준일
  "gp_info": [
    {
      "id": "uuid",
      "name": "GP명",
      "entity_type": "corporate"
    }
  ],
  "members": [
    {
      "name": "조합원명",
      "entity_type": "individual",
      "birth_date": "1990-01-01",
      "business_number": null,
      "address": "주소",
      "phone": "010-1234-5678",
      "units": 100
    }
  ],
  "generated_at": "2024-01-15T10:00:00Z"
}
```

### 3.2 API 엔드포인트

**신규 API 경로:**

```
/api/admin/funds/{fundId}/generated-documents/member-list/
```

**필요한 엔드포인트:**

1. **생성**

   - `POST /api/admin/funds/{fundId}/generated-documents/member-list/generate`
   - 요청 Body:
     ```json
     {
       "assembly_date": "2024-01-15" // 기준일
     }
     ```
   - 응답:
     ```json
     {
       "document": {
         "id": "uuid",
         "fund_id": "uuid",
         "type": "member_list",
         "version": "1.0.0",
         "generated_at": "2024-01-15T10:00:00Z",
         "pdf_url": "https://..."
       }
     }
     ```

2. **조회 (최신 문서)**

   - `GET /api/admin/funds/{fundId}/generated-documents/member-list`
   - 응답:
     ```json
     {
       "document": {
         /* 문서 정보 */
       }
     }
     ```
   - 404: 문서가 없는 경우

3. **미리보기**

   - `GET /api/admin/funds/{fundId}/generated-documents/member-list/preview`
   - 쿼리 파라미터: `assembly_date` (기준일)
   - 응답: PDF Buffer (Base64)

4. **다운로드**

   - `GET /api/admin/funds/{fundId}/generated-documents/member-list/{id}/download`
   - 응답: PDF 파일

5. **삭제**

   - `DELETE /api/admin/funds/{fundId}/generated-documents/member-list/{id}`
   - 응답:
     ```json
     {
       "message": "문서가 삭제되었습니다."
     }
     ```

6. **버전 목록 조회 (선택사항)**

   - `GET /api/admin/funds/{fundId}/generated-documents/member-list/versions`
   - 응답:
     ```json
     {
       "versions": [
         {
           "id": "uuid",
           "version": "1.0.0",
           "generated_at": "2024-01-15T10:00:00Z",
           "assembly_date": "2024-01-15"
         }
       ]
     }
     ```

7. **Diff 조회 (선택사항)**
   - `GET /api/admin/funds/{fundId}/generated-documents/member-list/diff`
   - 응답:
     ```json
     {
       "diff": {
         "hasChanges": true,
         "contextChanges": {
           "membersAdded": ["조합원1"],
           "membersRemoved": ["조합원2"],
           "membersModified": [
             {
               "name": "조합원3",
               "changes": {
                 "address": { "old": "구주소", "new": "신주소" }
               }
             }
           ]
         }
       }
     }
     ```

### 3.3 UI/UX 설계

**위치:** `FundDetailManager.tsx` → "문서 생성" 탭

**추가할 섹션:**

```tsx
<TabsContent value="document-generation">
  {/* 기존: 규약 */}
  <DocumentGenerationSection ... />

  {/* 기존: 규약동의서 */}
  <LpaConsentFormSection ... />

  {/* 신규: 조합원 명부 */}
  <MemberListSection fundId={fundId} />
</TabsContent>
```

**MemberListSection 컴포넌트 구조:**

```tsx
'use client';

interface MemberListSectionProps {
  fundId: string;
}

export default function MemberListSection({ fundId }: MemberListSectionProps) {
  const [latestDocument, setLatestDocument] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [assemblyDate, setAssemblyDate] = useState(''); // 기준일 입력

  // 최신 문서 조회
  // 생성 핸들러
  // 미리보기 핸들러
  // 다운로드 핸들러
  // 삭제 핸들러

  return (
    <Card>
      <CardHeader>
        <CardTitle>조합원 명부</CardTitle>
        <CardDescription>
          현재 조합원 정보를 바탕으로 조합원 명부를 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 최신 문서 정보 표시 */}
        {/* 기준일 입력 필드 */}
        {/* 생성/미리보기/다운로드/삭제 버튼 */}
      </CardContent>
    </Card>
  );
}
```

**사용자 플로우:**

1. **생성 플로우**

   ```
   "문서 생성" 탭 클릭
   → 조합원 명부 섹션 확인
   → 기준일 입력 (기본값: 오늘)
   → "미리보기" 버튼 클릭 (선택사항)
   → "생성" 버튼 클릭
   → 자동 다운로드
   → 최신 문서 정보 표시
   ```

2. **재생성 플로우**

   ```
   기존 문서 확인
   → 조합원 정보 변경 감지 (Diff 표시)
   → 새 기준일 입력
   → "재생성" 버튼 클릭
   → 자동 다운로드
   → 버전 업데이트
   ```

3. **다운로드 플로우**

   ```
   최신 문서 확인
   → "다운로드" 버튼 클릭
   → PDF 파일 다운로드
   ```

4. **삭제 플로우**
   ```
   최신 문서 확인
   → "삭제" 버튼 클릭
   → 확인 대화상자
   → 삭제 완료
   ```

### 3.4 코드 재사용 전략

**변경 없이 재사용:**

- `lib/pdf/member-list-generator.ts` → `generateMemberListPDF()`
- `lib/admin/assembly-documents.ts` → `generateMemberListBuffer()`, `getFundMemberData()`

**신규 생성:**

- `app/api/admin/funds/[fundId]/generated-documents/member-list/` (API 라우터)
- `components/admin/MemberListSection.tsx` (UI 컴포넌트)
- `lib/admin/member-list-documents.ts` (신규 비즈니스 로직, 선택사항)

**수정 대상:**

- ❌ 없음 (총회 문서 생성은 그대로 유지)

## 4. 구현 단계

### Phase 1: API 구현

1. API 라우터 생성

   - `generate/route.ts` (생성)
   - `route.ts` (조회)
   - `preview/route.ts` (미리보기)
   - `[id]/download/route.ts` (다운로드)
   - `[id]/route.ts` (삭제)

2. 비즈니스 로직 (선택사항)
   - 기존 함수 재사용으로 충분하면 스킵
   - 필요시 `lib/admin/member-list-documents.ts` 생성

### Phase 2: UI 구현

1. `MemberListSection` 컴포넌트 생성

   - 규약동의서 섹션 참고하여 구조 복사
   - 기준일 입력 필드 추가
   - Diff 로직 통합 (선택사항)

2. `FundDetailManager.tsx` 수정
   - "문서 생성" 탭에 `MemberListSection` 추가

### Phase 3: 테스트

1. 생성 테스트

   - 기준일 입력하여 생성
   - PDF 다운로드 확인
   - DB 저장 확인

2. 재생성 테스트

   - 조합원 정보 변경 후 재생성
   - Diff 확인 (구현 시)

3. 삭제 테스트
   - 문서 삭제
   - Storage 파일 삭제 확인

## 5. 주의사항

### 5.1 기존 총회 문서 생성과의 관계

- 총회 문서 생성에서 조합원 명부 생성 기능은 **그대로 유지**
- 독립 문서 생성은 **추가적인 옵션**으로 제공
- 두 기능이 독립적으로 작동하며 서로 영향을 주지 않음

### 5.2 데이터 일관성

- 독립 문서와 총회 문서는 **별도 테이블**에 저장
- `generated_documents` (독립 문서) vs `assembly_documents` (총회 문서)
- 동일한 생성 로직을 사용하지만 저장 위치가 다름

### 5.3 버전 관리

- 기준일(`assembly_date`)을 버전 구분자로 사용
- 동일 기준일로 재생성 시 기존 문서 삭제 후 새 문서 생성
- 버전 히스토리 관리는 Phase 2 이후 고려

### 5.4 권한 관리

- 기존 관리자 권한 로직 재사용
- `validateAdminAuth()` 사용

## 6. 예상 작업량

### 파일 생성/수정 예상

- **신규 생성:** 약 6개 파일
  - API 라우터: 5개
  - UI 컴포넌트: 1개
- **수정:** 1개 파일
  - `FundDetailManager.tsx` (섹션 추가)

### 예상 소요 시간

- Phase 1 (API): 2-3시간
- Phase 2 (UI): 2-3시간
- Phase 3 (테스트): 1시간
- **총 예상 시간:** 5-7시간

## 7. 향후 확장 계획

### 7.1 버전 히스토리 관리

- 모든 생성 이력 보관
- 과거 버전 조회 및 다운로드
- 버전 비교 기능

### 7.2 조합원 정보 변경 알림

- 조합원 추가/제거/수정 시 알림
- 재생성 권장 메시지 표시

### 7.3 일괄 문서 생성

- 여러 문서를 한 번에 생성
- ZIP 파일로 다운로드

### 7.4 이메일 발송 기능

- 조합원 명부를 이메일로 발송
- 총회 이메일 발송 기능과 별도

## 8. 체크리스트

### 구현 전

- [ ] 기획서 검토 및 승인
- [ ] 데이터베이스 마이그레이션 필요 여부 확인
- [ ] 기존 코드 재사용 가능 여부 확인

### 구현 중

- [ ] API 엔드포인트 구현
- [ ] UI 컴포넌트 구현
- [ ] 기존 함수 재사용
- [ ] 에러 핸들링 추가

### 구현 후

- [ ] 단위 테스트
- [ ] 통합 테스트
- [ ] 사용자 테스트
- [ ] 문서화

## 9. 참고 자료

### 관련 파일

- `lib/admin/assembly-documents.ts` (생성 로직)
- `lib/pdf/member-list-generator.ts` (PDF 생성)
- `components/admin/lpa-consent-form/LpaConsentFormSection.tsx` (UI 참고)
- `types/assemblies.ts` (타입 정의)

### 관련 기획 문서

- `design_mds/LPA_CONSENT_FORM_SAMPLE_DESIGN.md` (규약동의서 기획)
- `design_mds/ASSEMBLY_DOCUMENT_GENERATION_FIX.md` (총회 문서 생성 개선)
