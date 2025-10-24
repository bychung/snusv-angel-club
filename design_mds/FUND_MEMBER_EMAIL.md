# 조합원 이메일 발송 기능 기획

**구현 상태: ✅ Phase 1 완료**

## 1. 개요

펀드 관리 페이지의 조합원 목록에서 관리자가 조합원들에게 직접 이메일을 발송할 수 있는 기능을 추가합니다.

## 2. 주요 기능

### 2.1 이메일 발송 버튼

- **위치**: 조합원 목록 페이지 상단, '일괄 업로드', '조합원 추가' 버튼이 있는 라인의 맨 왼쪽
- **버튼명**: "이메일 발송"
- **아이콘**: Mail 아이콘 (lucide-react의 `Mail`)

### 2.2 이메일 작성 모달

#### 2.2.1 모달 구성

1. **제목 입력란**

   - 플레이스홀더: "이메일 제목을 입력하세요"
   - 필수 입력

2. **수신자 선택 영역**

   - 조합원 목록이 체크박스와 함께 표시
   - 전체 선택/해제 기능
   - 각 조합원 정보 표시:
     - 체크박스
     - 이름
     - 이메일
   - 선택된 수신자 수 표시 (예: "총 30명 중 5명 선택됨")

3. **본문 입력란**

   - Textarea 형태
   - 최소 높이: 200px
   - 플레이스홀더: "이메일 본문을 입력하세요"
   - 필수 입력

4. **첨부파일**

   - 파일 업로드 기능
   - 지원 형식: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
   - 최대 파일 크기: 10MB
   - 최대 첨부파일 수: 5개
   - 첨부된 파일 목록 표시 및 삭제 기능

5. **액션 버튼**
   - "취소" 버튼 (모달 닫기)
   - "발송" 버튼 (이메일 발송)

#### 2.2.2 유효성 검증

- 수신자가 1명 이상 선택되어야 함
- 제목이 비어있으면 안됨
- 본문이 비어있으면 안됨
- 첨부파일이 있는 경우, 파일 형식 및 크기 검증

#### 2.2.3 발송 프로세스

1. "발송" 버튼 클릭 시 확인 알림창 표시
   - "선택한 {수신자 수}명에게 이메일을 발송하시겠습니까?"
2. 확인 시 API 호출
3. 로딩 상태 표시
4. 발송 결과에 따라:
   - 성공: 성공 메시지 표시 후 모달 닫기
   - 실패: 에러 메시지 표시 (모달 유지)

## 3. UI/UX 상세

### 3.1 버튼 스타일

```tsx
<Button variant="default">
  <Mail className="h-4 w-4 mr-2" />
  이메일 발송
</Button>
```

### 3.2 모달 크기

- 너비: 최대 800px
- 높이: 최대 90vh (스크롤 가능)

### 3.3 수신자 목록 UI

- 검색 기능 포함 (이름, 이메일로 검색)
- 최대 높이 400px, 스크롤 가능
- 각 항목:
  ```
  [✓] 홍길동 (jyk@wavelaw.co.kr)
  [ ] 박창석 (tochangpark@gmail....)
  ```

### 3.4 로딩 상태

- 발송 중: 버튼에 로딩 스피너 표시, 버튼 비활성화
- 모달 닫기 방지

## 4. 기술 구조

### 4.1 컴포넌트 구조

```
components/admin/
├── MemberActionButtons.tsx (수정)
│   └── 이메일 발송 버튼 추가
└── FundMemberEmailModal.tsx (신규)
    ├── 이메일 작성 폼
    ├── 수신자 선택 리스트
    └── 첨부파일 관리
```

### 4.2 API 엔드포인트

```
POST /api/admin/funds/[fundId]/members/email/send
```

#### 요청 Body

```typescript
{
  recipient_ids: string[];      // 수신자 profile ID 배열
  subject: string;              // 이메일 제목
  body: string;                 // 이메일 본문 (plain text)
  attachments?: {               // 선택적 첨부파일
    filename: string;
    content: string;            // base64 encoded
    contentType: string;
  }[];
}
```

#### 응답

```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

### 4.3 재사용 가능한 기능

기존 이메일 발송 인프라를 재사용:

- `lib/email/gmail.ts` - GmailService
- `lib/email/assembly-notifications.ts` - sendAssemblyEmail 함수
  - 첨부파일을 선택사항으로 수정하여 재사용

### 4.4 상태 관리

- Modal open/close: useState
- Form data: useState 또는 react-hook-form
- 선택된 수신자: useState (Set<string>)
- 첨부파일: useState

## 5. 데이터베이스 (선택사항)

### 5.1 이메일 발송 기록 저장

조합원 이메일 발송 기록을 저장하려면 새 테이블 생성:

```sql
CREATE TABLE fund_member_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand VARCHAR(50) NOT NULL,
  fund_id UUID NOT NULL REFERENCES funds(id),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  recipient_ids UUID[] NOT NULL,
  recipient_emails TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fund_member_emails_fund_id ON fund_member_emails(fund_id);
CREATE INDEX idx_fund_member_emails_sender_id ON fund_member_emails(sender_id);
CREATE INDEX idx_fund_member_emails_status ON fund_member_emails(status);
```

**Note**: 발송 기록 저장은 선택사항입니다. 초기 구현에서는 생략 가능합니다.

## 6. 구현 순서

### Phase 1: 기본 기능 ✅ 완료

1. ✅ `FundMemberEmailModal` 컴포넌트 생성
   - 기본 UI 구조
   - 수신자 선택 (체크박스)
   - 제목/본문 입력
   - 검색 기능
   - 전체 선택/해제 기능
2. ✅ `MemberActionButtons`에 이메일 발송 버튼 추가
3. ✅ API 엔드포인트 구현
   - `/api/admin/funds/[fundId]/members/email/send`
   - 기존 `sendAssemblyEmail` 재사용
   - 조합원 권한 검증
4. ✅ 발송 플로우 연결 및 테스트

### Phase 2: 개선 기능 (선택사항)

1. 첨부파일 기능 추가
2. ~~수신자 검색/필터 기능~~ (✅ Phase 1에서 완료)
3. 이메일 템플릿 기능
4. 발송 기록 저장 및 조회
5. 미리보기 기능

## 7. 구현 완료 내역 (Phase 1)

### 생성된 파일

1. **components/admin/FundMemberEmailModal.tsx**

   - 이메일 작성 모달 컴포넌트
   - 수신자 선택, 검색 기능
   - 제목/본문 입력
   - 발송 확인 및 로딩 상태

2. **app/api/admin/funds/[fundId]/members/email/send/route.ts**
   - 조합원 이메일 발송 API
   - 관리자 권한 확인
   - 조합원 권한 검증
   - Gmail API를 통한 이메일 발송

### 수정된 파일

1. **components/admin/MemberActionButtons.tsx**

   - 이메일 발송 버튼 추가
   - members props 추가

2. **app/admin/funds/[fundId]/page.tsx**
   - MemberActionButtons에 members 전달

## 8. 고려사항

### 8.1 보안

- 관리자 권한 확인 필수 (`validateAdminAuth`)
- 해당 펀드의 조합원에게만 발송 가능하도록 검증
- 이메일 주소 유효성 검증

### 8.2 제한사항

- Gmail API 발송 제한 고려
  - 일일 발송량: 사용자당 500통
  - 배치 발송: 한 번에 최대 100명
- 대량 발송 시 배치 처리 고려

### 8.3 사용자 경험

- 발송 실패 시 명확한 에러 메시지
- 발송 전 확인 절차
- 발송 후 성공 피드백

### 8.4 테스트

- 초기 테스트는 제한된 이메일 주소로만 발송
- API 코드 내 테스트용 수신자 설정 가능 (주석 처리됨)
  ```typescript
  // const recipientEmails = ['by@decentier.com']; // 테스트용
  ```

## 9. 참고 자료

### 기존 구현

- `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/email/send/route.ts`
- `lib/email/assembly-notifications.ts`
- `lib/email/gmail.ts`
- `components/admin/MemberActionButtons.tsx`
- `components/admin/FundMemberManagement.tsx`

### 유사 기능

- 조합원 총회 이메일 발송 기능을 참고하여 구현
