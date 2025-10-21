## 조합원 총회 템플릿 미리보기 색상 규칙 재정의 (설계)

### 목표

- 템플릿 `${...}` 변수 표기와 미리보기 치환 값의 색상 규칙을 일관되게 정의한다.
- 미리보기에서 샘플 데이터로 치환된 값은 노란색으로 강조하고, 값이 없어 원형 `${...}` 그대로인 것은 파란색으로 표시한다.
- 사용자가 템플릿 편집 중 미리보기로 즉시 차이를 직관적으로 이해하도록 한다.

### 용어 정의

- 템플릿 변수: `${변수명}` 형태로 템플릿에 삽입되는 플레이스홀더.
- 미리보기 컨텍스트 값: 미리보기 시점에 템플릿에 주입 가능한 값들의 집합.
  - 샘플 데이터 값: `generateSampleData(type)`가 제공하는 값 (예: `fund_name`, `assembly_date`).
  - 사용자 입력값: 에디터에서 설정한 템플릿 `content` 값 (예: `chairman`, `agendas[].title`).
  - 파생/루프 값: 렌더링 시점에 계산되는 값 (예: `index`).

### 색상 규칙 (최종)

- 파란색 PREVIEW (`<<PREVIEW>>…<<PREVIEW_END>>`):

  - 값이 없어 `${...}` 그대로 노출되어야 하는 경우에만 적용한다.
  - 즉, 미리보기 컨텍스트에 치환 가능한 값이 없는 변수의 원형 표기 `${...}` 주위에 적용된다.

- 노란색 INPUT (`<<INPUT>>…<<INPUT_END>>`):

  - 미리보기에서 샘플 데이터로 렌더링되는 **모든 값**에 적용한다.
  - 여기에는 두 가지 케이스가 포함된다:
    1. 템플릿 변수 `${...}`를 치환한 값 (예: `${fund_name}` → `'테스트 투자조합'`)
    2. 샘플 데이터 배열/객체를 직접 렌더링한 값 (예: 조합원 명부의 조합원 이름, 주소, 전화번호 등)
  - 출처는 구분하지 않는다. `generateSampleData()`로 제공된 모든 값, 사용자가 에디터에서 입력한 값, 렌더링 시점에 계산된 파생 값 모두 동일하게 노란색.
  - **핵심**: "미리보기에서만 보이는 임시/테스트 데이터"임을 시각적으로 강조하는 것이 목적.

- 회색 GRAY (`<<GRAY>>…<<GRAY_END>>`):
  - 보조 텍스트(예: 명부 하단 `(조합인감)`)에 그대로 유지.

참고: 마커 토큰 명칭은 구현에서 이미 `PREVIEW`, `INPUT`, `GRAY`로 사용 중이나, 의미상 `INPUT`은 “미리보기에서의 값(Value)”을 의미하도록 확장한다.

### 적용 범위

- 결성총회 의안 (`formation_agenda`): 제목, 의안 제목 템플릿, 하단 메시지 등 텍스트 내 모든 `${...}`
- 조합원 명부 (`formation_member_list`): 제목, 테이블 헤더 라벨, 하단 레이블 등 텍스트 내 `${...}`
- 향후 동일 패턴을 사용하는 모든 총회 템플릿에 공통 적용

### 렌더링 파이프라인 변경

1. 컨텍스트 수집 단계

   - 공통 컨텍스트: `fund_name`, `assembly_date` 등 상단 데이터
   - 의안 루프 컨텍스트: 각 의안에 대해 `{ index, title, ... }`
   - 명부 컨텍스트: 헤더/푸터/행 렌더링에 필요한 값들

2. 템플릿 문자열 해석 단계 (신규 유틸)

   - 함수: `renderTemplateString(template: string, context: Record<string, any>, isPreview: boolean): string`
   - 동작:
     - `${var}` 토큰을 탐색
     - 컨텍스트에 `var` 값이 존재하고 비어있지 않으면: 값 문자열로 치환하고, `isPreview=true`인 경우 `<<INPUT>>값<<INPUT_END>>`로 감싼다.
     - 컨텍스트에 값이 없거나 빈 문자열이면: 원형 `${var}`를 유지하되, `<<PREVIEW>>${var}<<PREVIEW_END>>`로 감싼다.
   - 특징:
     - 부분 문자열 결합을 그대로 유지하여 마커 파서(`renderStyledText`)가 처리할 수 있도록 한다.
     - 라벨/템플릿이 `null/undefined`일 경우 안전하게 빈 문자열 처리한다.

3. 스타일 마커 파싱/렌더링 단계
   - 기존 `parseStyleMarkers` + `renderStyledText` 그대로 사용.
   - 마커 우선순위는 기존 구현을 따른다.

### 구현 변경안 (요약)

- 공통 유틸 추가 (예: `lib/pdf/template-utils.ts`):

  - `renderTemplateString(template, context, isPreview)`
  - 내부에서 `${...}` 검색 및 컨텍스트 기반 치환/마킹 수행

- `lib/pdf/formation-agenda-generator.ts` 수정:

  - 제목: 기존 `wrapTemplateVariables(titleTemplate)` → `renderTemplateString(titleTemplate, { fund_name: data.fund_name }, isPreview)`
  - 일시/의장 등 값 필드: 기존 `wrapInputValueForPreview(value, isPreview)` 유지 (템플릿 변수가 아닌 순수 값 강조)
  - 의안 제목 템플릿: `renderTemplateString(labels.agenda_title_template, { index: index+1, title: agenda.title }, isPreview)`
  - 하단 메시지: `renderTemplateString(footerMessage, { ...공통 }, isPreview)`

- `lib/pdf/member-list-generator.ts` 수정:

  - 제목/헤더 라벨/푸터 라벨: `renderTemplateString(…, 공통컨텍스트, isPreview)` 적용
  - **테이블 행 값 (조합원 데이터)**: 미리보기 시 모든 셀 값을 `wrapInputValueForPreview(value, isPreview)`로 감싸서 노란색 표시
    - 예: `member.name`, `member.phone`, `member.units.toLocaleString()` 등
    - 템플릿 변수가 아닌 직접 렌더링 값이지만, 샘플 데이터이므로 노란색으로 강조

- 기존 `wrapTemplateVariables`는 미리보기에서 “강제 파란색” 표시용으로 남기되, 위 치환 로직 적용 지점에서는 사용하지 않는다.

### 예시 시나리오

#### 1. 템플릿 변수 치환 (값 존재)

- 템플릿: `${fund_name} 결성총회`
- 샘플 데이터: `{ fund_name: '테스트 투자조합' }`
- 미리보기 결과: `<<INPUT>>테스트 투자조합<<INPUT_END>> 결성총회`

#### 2. 템플릿 변수 치환 (값 없음)

- 템플릿: `${fund_name} 결성총회`
- 샘플 데이터: `{ fund_name: '' }` 또는 미제공
- 미리보기 결과: `<<PREVIEW>>${fund_name}<<PREVIEW_END>> 결성총회`

#### 3. 루프 내 템플릿 변수 치환

- 템플릿: `(제${index}호 의안) ${title}`
- 루프 i=1, 의안.title='규약(안) 승인의 건'
- 결과: `(제<<INPUT>>1<<INPUT_END>>호 의안) <<INPUT>>규약(안) 승인의 건<<INPUT_END>>`

#### 4. 배열 데이터 직접 렌더링 (조합원 명부)

- 샘플 데이터: `{ members: [{ name: '홍길동', phone: '010-1234-5678', units: 100, ... }] }`
- 테이블 셀 렌더링:
  - 이름 셀: `<<INPUT>>홍길동<<INPUT_END>>`
  - 전화번호 셀: `<<INPUT>>010-1234-5678<<INPUT_END>>`
  - 출자좌수 셀: `<<INPUT>>100<<INPUT_END>>`
- **주의**: 이 값들은 `${...}` 변수가 아니라 배열을 순회하며 직접 렌더링하는 값이지만, 샘플 데이터이므로 모두 노란색으로 표시한다.

### 엣지 케이스

- 템플릿 오탈자(`${var)`처럼 중괄호가 닫히지 않는 경우)는 치환 대상이 아니다. 그대로 일반 텍스트로 출력(검은색)한다.
- 값이 공백 문자열인 경우: “없음”으로 간주하여 파란색 `${var}`로 남긴다. (빈 문자열을 치환된 값으로 보기 어려움)
- 중첩/중복 변수는 좌→우 탐색 순서대로 처리한다. 동일 변수 다중 등장 모두 동일 규칙 적용.

### 호환성/명명

- 마커 토큰은 그대로 사용한다: `PREVIEW`(파란색), `INPUT`(노란색), `GRAY`(회색)
- 코드 주석/문서에서 `INPUT` 의미를 “미리보기에서 치환된 값”으로 확장 정의한다.

### 테스트 계획

- 단위 테스트(문자열 치환):
  - 값 존재/미존재, 빈 문자열, 다중 변수, 루프 변수, 한글 포함, 이모지 포함
- 통합 테스트(PDF 렌더):
  - 제목/의안 제목/하단 메시지에서 노란색·파란색 마커가 올바르게 조합되어 좌우 정렬/중앙 정렬에서도 배치 깨지지 않는지 확인
- 리그레션: 명부의 GRAY 마커 처리, zebra striping, 테두리 렌더가 기존과 동일한지 확인

### 구현 작업 목록 (개발용)

1. ✅ 공통 유틸 `renderTemplateString` 추가 (`lib/pdf/template-utils.ts`)
2. ✅ 결성총회 의안 생성기에서 제목/의안제목/하단 메시지 치환 적용
3. ✅ 명부 생성기에서 제목/헤더/푸터 치환 적용
4. ✅ 명부 생성기에서 테이블 행 값(조합원 데이터) 노란색 강조 적용
5. ✅ 주석/문서에 `INPUT` 의미 확장 반영
6. 🔄 샘플 케이스로 수동 QA
   - 결성총회 의안: fund_name 유/무, agendas.title 유/무
   - 조합원 명부: fund_name 유/무, members 배열 렌더링 시 모든 셀 값 노란색 확인

### 구현 완료 내역 (2024-10-19)

#### 1. 공통 유틸 추가 (`lib/pdf/template-utils.ts`)

- `renderTemplateString()`: 템플릿 변수 치환 및 마커 적용
- `wrapInputValueForPreview()`: 직접 렌더링 값 노란색 강조
- `STYLE_MARKERS`: 마커 토큰 상수 정의

#### 2. 결성총회 의안 생성기 수정 (`lib/pdf/formation-agenda-generator.ts`)

- 제목: `renderTemplateString(titleTemplate, { fund_name }, isPreview)` 적용
- 의안 제목: `renderTemplateString(agenda_title_template, { index, title }, isPreview)` 적용
- 하단 메시지: `renderTemplateString(footerMessage, commonContext, isPreview)` 적용
- 일시/의장: 기존 `wrapInputValueForPreview()` 유지

#### 3. 조합원 명부 생성기 수정 (`lib/pdf/member-list-generator.ts`)

- 제목: `renderTemplateString(title, commonContext, isPreview)` 적용
- 헤더 라벨: `renderTemplateString(col.label, commonContext, isPreview)` 적용
- 푸터 라벨: `renderTemplateString(gp_prefix/seal_text, commonContext, isPreview)` 적용
- 테이블 행 값: 모든 셀 값에 `wrapInputValueForPreview(value, isPreview)` 적용
  - 번호, 이름, 생년월일/사업자번호, 주소, 전화번호, 출자좌수 모두 노란색 강조

#### 4. 스타일 마커 시스템 정리

- 기존 `STYLE_MARKERS` (마커 + 색상)를 분리
- `STYLE_MARKERS` (마커 토큰만, `template-utils.ts`에서 export)
- `STYLE_MARKER_COLORS` (색상 정의, 각 생성기 파일 내부)
- 주석으로 INPUT의 의미를 "미리보기에서 샘플 데이터로 렌더링되는 모든 값"으로 명시
