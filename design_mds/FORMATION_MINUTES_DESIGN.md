# 결성총회 의사록 문서 생성 기획

## 1. 개요

### 1.1 목적

결성총회가 완료된 후 의사록을 생성하는 기능을 추가합니다. 결성총회 의사록은 결성총회에서 논의된 의안들의 승인 결과를 기록하는 공식 문서입니다.

### 1.2 문서 위치

- **문서 타입**: `formation_minutes` (결성총회 의사록)
- **생성 순서**: 조합원 명부 → 결성총회 의안 → **결성총회 의사록** (새로 추가)
- **생성 시점**: 결성총회 의안 생성 이후 (의안 내용을 참조해야 하므로)

### 1.3 문서 특성

- **편집 가능 여부**: 일부 편집 가능
  - 자동 생성 항목: 조합명, 일시, 의장 (의안에서 자동), 의안 목록
  - 편집 가능 항목: 장소, 출석 조합원 선택 (체크박스), 의안별 승인 결과
- **템플릿 사용**: Yes (DB 또는 fallback으로 JSON 파일)
- **생성 방식**: 반자동 (대부분 자동 생성, 출석자 선택 및 의안 결과만 확인/수정)

---

## 2. 문서 구조 분석

### 2.1 이미지 기반 문서 구조

```
┌────────────────────────────────────────────────────────┐
│  프로펠-SNUSV엔젤투자조합1호 결성총회 의사록              │
├────────────────────────────────────────────────────────┤
│                                                         │
│  1. 일시: 2024년 7월 19일 오후 2시                       │
│                                                         │
│  2. 장소: 업무집행조합원 회의실 (서면으로 진행)           │
│                                                         │
│  3. 출자자 및 출석 현황: 총 조합원 22명 중 22명 출석      │
│                                                         │
│  [조합원 정보 테이블]                                    │
│  ┌────┬──────────┬──────┬──────────┬──────┐          │
│  │구분│조합원명    │총 출석│조합원명   │총 출석│          │
│  │    │          │자좌수│           │자좌수│          │
│  ├────┼──────────┼──────┼──────────┼──────┤          │
│  │업무│프로펠벤처스│  17  │곽준영     │  20  │          │
│  │집행│김병우      │  20  │이세림     │  20  │          │
│  │조합│김재우      │  33  │이수민     │  30  │          │
│  │원  │김진산      │  33  │이승현     │  20  │          │
│  │    │김현식      │  10  │이현       │  10  │          │
│  ├────┼──────────┼──────┼──────────┼──────┤          │
│  │유한│김혜연      │  20  │정수진     │  10  │          │
│  │책임│넥스큐브... │ 100  │조세원     │  30  │          │
│  │조합│목승환      │  10  │조재용     │  20  │          │
│  │원  │박창석      │  10  │채경병     │  20  │          │
│  │(가 │㈜엘에스티  │  33  │최영수     │  50  │          │
│  │나다│이상욱      │  20  │허선행     │  30  │          │
│  │순) │            │      │           │      │          │
│  └────┴──────────┴──────┴──────────┴──────┘          │
│                                                         │
│  4. 개회선언: 업무집행조합원인 프로펠벤처스 주식회사      │
│     대표이사 정보영 및 곽준영은 본회의가 규약에 의해      │
│     적법하게 성립되었음을 확인하고 개회를 선언하다.       │
│     의장은 규약에 따라 공동의장으로 각 업무집행조합원    │
│     프로펠벤처스 주식회사 대표이사인 정보영과            │
│     곽준영이 맡다. 의장은 조합원 출자좌수의 100%가       │
│     출석하였음을 보고하다. 이어 아래와 같이 의안 심의를  │
│     진행하다.                                           │
│                                                         │
│  5. 의안심의                                            │
│                                                         │
│  제1호의안: 규약(안) 승인의 건                           │
│  - 원안대로 승인하다                                    │
│                                                         │
│  제2호의안: 사업계획 승인의 건                           │
│  - 원안대로 승인하다                                    │
│                                                         │
│  상기와 같이 상정된 의안과 결과에 대해 이의가 없음을     │
│  확인한 후 의장은 상정된 의안들이 승인되었음을           │
│  선언하다. 의장은 이상으로 조합원총회의 목적사항에       │
│  대한 심의 및 의결을 종료하였으므로 폐회를 선언하다.     │
│                                                         │
│  위 의사의 경과요령과 결과를 명확히 하기 위하여         │
│  이 의사록을 작성하고 업무집행조합원이 아래와 같이      │
│  기명 날인하다.                                         │
│                                                         │
│                                       2024년 7월 19일   │
│                    프로펠-SNUSV엔젤투자조합1호           │
│                                                         │
│  업무집행조합원  프로펠벤처스 주식회사 대표이사         │
│                  정보영 (인)                            │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 2.2 문서 섹션 분석

| 섹션          | 내용                              | 데이터 소스                   | 편집 가능 여부     |
| ------------- | --------------------------------- | ----------------------------- | ------------------ |
| 문서 제목     | "{조합명} 결성총회 의사록"        | 펀드명 (자동)                 | ❌                 |
| 1. 일시       | 날짜 + "오후 2시" (고정)          | 총회 날짜 (자동)              | ❌                 |
| 2. 장소       | 기본값 제공                       | 템플릿 기본값                 | ✅ 수정 가능       |
| 3. 출석 현황  | "총 조합원 X명 중 Y명 출석"       | 조합원 체크박스 선택          | ✅ 체크박스로 선택 |
| 조합원 테이블 | 구분, 조합원명, 출자좌수          | 선택된 조합원만 표시          | ❌                 |
| 4. 개회선언   | 의장 정보 포함된 문구             | 의장 (의안에서 자동) + 템플릿 | ❌                 |
| 5. 의안심의   | 의안 목록 및 승인 결과            | 결성총회 의안 (자동) + 템플릿 | ❌ 의안, ✅ 결과   |
| 하단 메시지   | 폐회 선언 및 작성 정보            | 템플릿 텍스트                 | ❌                 |
| 날짜/서명     | 날짜, 조합명, 업무집행조합원 서명 | 자동                          | ❌                 |

---

## 3. 데이터 설계

### 3.1 변수 정의

| 변수명                  | 설명                      | 예시                                  | 소스                       |
| ----------------------- | ------------------------- | ------------------------------------- | -------------------------- |
| `fund_name`             | 조합명                    | 프로펠-SNUSV엔젤투자조합1호           | funds 테이블               |
| `assembly_date`         | 총회 개최 날짜            | 2024년 7월 19일                       | assemblies 테이블          |
| `assembly_time`         | 총회 개최 시간 (고정)     | 오후 2시                              | 템플릿 고정값              |
| `location`              | 총회 장소                 | 업무집행조합원 회의실 (서면으로 진행) | 템플릿 기본값 (편집 가능)  |
| `attended_member_ids`   | 출석 조합원 ID 목록       | [id1, id2, ...]                       | 사용자 선택 (기본값: 전체) |
| `all_members`           | 전체 조합원 목록          | [{id, name, type, units}, ...]        | fund_members + profiles    |
| `attended_members_data` | 출석 조합원 정보          | [{name, type, units}, ...]            | all_members + 필터링       |
| `gp_list`               | 업무집행조합원 목록       | [{name, representative}, ...]         | GP만 추출                  |
| `gp_names_full`         | 의장(GP) 전체 이름 문자열 | "프로펠벤처스 주식회사 대표이사..."   | gp_list로 생성             |
| `chairman_from_agenda`  | 의안 문서의 의장 정보     | "업무집행조합원 프로펠벤처스..."      | 의안 데이터 (자동)         |
| `agendas`               | 의안 목록                 | [{index, title, result}, ...]         | 의안 데이터 + 기본 결과    |

**계산 가능한 값 (저장하지 않음)**:

- `total_members` = `all_members.length`
- `attended_members` = `attended_members_data.length`
- `attendance_rate` = `(attended_members / total_members) * 100`

### 3.2 템플릿 Content 구조 (JSON 파일 저장)

**파일 위치**: `template/formation-minutes-template.json`

```json
{
  "title_template": "{fund_name} 결성총회 의사록",

  "sections": {
    "time": {
      "label": "1. 일시:",
      "value_template": "{assembly_date} {assembly_time}"
    },
    "location": {
      "label": "2. 장소:",
      "default_value": "업무집행조합원 회의실 (서면으로 진행)"
    },
    "attendance": {
      "label": "3. 출자자 및 출석 현황:",
      "template": "총 조합원 {total_members}명 중 {attended_members}명 출석"
    },
    "member_table": {
      "columns": [
        { "key": "type", "label": "구분", "width": 80 },
        { "key": "name", "label": "조합원명", "width": 120 },
        { "key": "units", "label": "총 출자좌수", "width": 80 },
        { "key": "name2", "label": "조합원명", "width": 120 },
        { "key": "units2", "label": "총 출자좌수", "width": 80 }
      ]
    },
    "opening": {
      "label": "4. 개회선언:",
      "template": "업무집행조합원인 {gp_names_full}은 본회의가 규약에 의해 적법하게 성립되었음을 확인하고 개회를 선언하다. 의장은 규약에 따라 공동의장으로 각 업무집행조합원 {gp_names_full}이 맡다. 의장은 조합원 출자좌수의 {attendance_rate}%가 출석하였음을 보고하다. 이어 아래와 같이 의안 심의를 진행하다."
    },
    "agendas": {
      "label": "5. 의안심의",
      "agenda_template": "제{index}호의안: {title}",
      "default_result": "원안대로 승인하다"
    },
    "closing": {
      "template": "상기와 같이 상정된 의안과 결과에 대해 이의가 없음을 확인한 후 의장은 상정된 의안들이 승인되었음을 선언하다. 의장은 이상으로 조합원총회의 목적사항에 대한 심의 및 의결을 종료하였으므로 폐회를 선언하다.\n\n위 의사의 경과요령과 결과를 명확히 하기 위하여 이 의사록을 작성하고 업무집행조합원이 아래와 같이 기명 날인하다."
    },
    "signature": {
      "date_label": "{assembly_date}",
      "fund_name_label": "{fund_name}",
      "gp_label": "업무집행조합원",
      "seal_text": "(인)"
    }
  }
}
```

**Note**:

- DB에 템플릿이 없을 경우 이 JSON 파일을 fallback으로 사용
- DB에 저장된 템플릿이 있으면 DB 버전 우선 사용

### 3.3 사용자 입력 데이터 (assembly_documents.content)

**중요**: content는 템플릿 전체 구조를 포함하며, 사용자가 편집한 값으로 덮어씁니다.
이렇게 하면 템플릿이 없어도 content만으로 문서를 재구성할 수 있습니다.

```json
{
  "title_template": "{fund_name} 결성총회 의사록",

  "sections": {
    "time": {
      "label": "1. 일시:",
      "value_template": "{assembly_date} {assembly_time}"
    },
    "location": {
      "label": "2. 장소:",
      "value": "업무집행조합원 회의실 (서면으로 진행)" // 사용자 수정 가능
    },
    "attendance": {
      "label": "3. 출자자 및 출석 현황:",
      "template": "총 조합원 {total_members}명 중 {attended_members}명 출석",
      "attended_member_ids": [
        // 사용자 선택 (체크박스)
        "member-id-1",
        "member-id-2",
        "member-id-3"
        // ... 선택된 조합원 ID 목록
      ]
    },
    "member_table": {
      "columns": [
        { "key": "type", "label": "구분", "width": 80 },
        { "key": "name", "label": "조합원명", "width": 120 },
        { "key": "units", "label": "총 출자좌수", "width": 80 },
        { "key": "name2", "label": "조합원명", "width": 120 },
        { "key": "units2", "label": "총 출자좌수", "width": 80 }
      ]
    },
    "opening": {
      "label": "4. 개회선언:",
      "template": "업무집행조합원인 {gp_names_full}은 본회의가 규약에 의해 적법하게 성립되었음을 확인하고 개회를 선언하다. 의장은 규약에 따라 공동의장으로 각 업무집행조합원 {gp_names_full}이 맡다. 의장은 조합원 출자좌수의 {attendance_rate}%가 출석하였음을 보고하다. 이어 아래와 같이 의안 심의를 진행하다."
    },
    "agendas": {
      "label": "5. 의안심의",
      "agenda_template": "제{index}호의안: {title}",
      "items": [
        // 사용자 편집 가능 (result 필드)
        {
          "index": 1,
          "title": "규약(안) 승인의 건",
          "result": "원안대로 승인하다"
        },
        {
          "index": 2,
          "title": "사업계획 승인의 건",
          "result": "원안대로 승인하다"
        }
      ]
    },
    "closing": {
      "template": "상기와 같이 상정된 의안과 결과에 대해 이의가 없음을 확인한 후 의장은 상정된 의안들이 승인되었음을 선언하다. 의장은 이상으로 조합원총회의 목적사항에 대한 심의 및 의결을 종료하였으므로 폐회를 선언하다.\n\n위 의사의 경과요령과 결과를 명확히 하기 위하여 이 의사록을 작성하고 업무집행조합원이 아래와 같이 기명 날인하다."
    },
    "signature": {
      "date_label": "{assembly_date}",
      "fund_name_label": "{fund_name}",
      "gp_label": "업무집행조합원",
      "seal_text": "(인)"
    }
  }
}
```

**설계 원칙**:

- `content` = 템플릿 전체 + 사용자 편집 값
- 템플릿이 없어도 `content`만으로 문서 구조 파악 가능
- 사용자 편집 가능 필드: `sections.location.value`, `sections.attendance.attended_member_ids`, `sections.agendas.items[].result`

### 3.4 자동 생성 데이터 (assembly_documents.context)

**중요**: context는 템플릿 변수에 들어갈 실제 데이터만 포함합니다.
content + context를 결합하면 완전한 문서가 생성됩니다.

```json
{
  "fund_name": "프로펠-SNUSV엔젤투자조합1호",
  "assembly_date": "2024년 7월 19일",
  "assembly_date_raw": "2024-07-19",
  "assembly_time": "오후 2시",

  "all_members": [
    {
      "id": "member-id-1",
      "type": "업무집행조합원",
      "name": "프로펠벤처스(주)",
      "units": 17,
      "representative": "정보영, 곽준영"
    },
    {
      "id": "member-id-2",
      "type": "업무집행조합원",
      "name": "김병우",
      "units": 20
    }
    // ... 전체 조합원 목록
  ],

  "attended_members_data": [
    {
      "id": "member-id-1",
      "type": "업무집행조합원",
      "name": "프로펠벤처스(주)",
      "units": 17
    },
    {
      "id": "member-id-2",
      "type": "업무집행조합원",
      "name": "김병우",
      "units": 20
    }
    // ... 출석 조합원만 (content.sections.attendance.attended_member_ids 기반으로 필터링)
  ],

  "gp_list": [
    {
      "name": "프로펠벤처스 주식회사",
      "representative": "정보영",
      "is_entity": true
    },
    {
      "name": "곽준영",
      "is_entity": false
    }
  ],

  "gp_names_full": "프로펠벤처스 주식회사 대표이사 정보영 및 곽준영",

  "chairman_from_agenda": "업무집행조합원 프로펠벤처스 주식회사 대표이사 정보영, 곽준영",

  "generated_at": "2024-07-20T10:30:00Z"
}
```

**설계 원칙**:

- `context` = 템플릿 변수 값만 (DB에서 조회한 실제 데이터)
- `all_members` = 전체 조합원 정보 (문서 재생성 시 필요)
- `attended_members_data` = 선택된 출석 조합원 정보 (PDF에 표시될 데이터)
- `content` + `context` = 완전한 문서

**계산 가능한 값**:

- `total_members` = `all_members.length`
- `attended_members` = `attended_members_data.length`
- `attendance_rate` = `(attended_members / total_members) * 100`

---

## 4. 문서 생성 플로우

### 4.1 생성 조건

- ✅ 조합원 명부 생성 완료
- ✅ 결성총회 의안 생성 완료
- 📝 의안에서 의장 정보 확인 가능

### 4.2 생성 단계

```
[1단계: 데이터 로드]
↓
- 펀드 정보 조회 (fund_name)
- 총회 정보 조회 (assembly_date)
- 조합원 목록 조회 (fund_members + profiles)
- 결성총회 의안 문서 조회 (chairman, agendas)
↓
[2단계: 기본값 생성]
↓
- location: 템플릿 기본값
- attended_members: total_members (전원 출석)
- agendas: 의안 목록 + 기본 결과 ("원안대로 승인하다")
↓
[3단계: 사용자 확인/수정]
↓
- 장소 수정 가능
- 출석 인원 수정 가능
- 의안별 결과 수정 가능 (승인/부결/수정 승인 등)
↓
[4단계: PDF 생성]
↓
- 템플릿 + 사용자 입력 + 자동 생성 데이터 결합
- PDF 생성 및 저장
↓
[5단계: 문서 저장]
↓
- assembly_documents 테이블에 저장
  - content: 사용자 입력 데이터
  - context: 자동 생성 데이터
  - template_id, template_version
  - pdf_storage_path
```

### 4.3 의존성 관리

**선행 문서 의존성:**

| 필요 데이터 | 소스 문서               | 필드                    |
| ----------- | ----------------------- | ----------------------- |
| 조합원 목록 | `formation_member_list` | context.members         |
| 의장 정보   | `formation_agenda`      | content.chairman        |
| 의안 목록   | `formation_agenda`      | content.agendas[].title |

**API에서 확인:**

```typescript
// GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document
// 응답 시 선행 문서 확인 로직 필요

// 조합원 명부와 의안이 모두 생성되어야 의사록 생성 가능
const memberList = await getAssemblyDocument(
  assemblyId,
  'formation_member_list'
);
const agenda = await getAssemblyDocument(assemblyId, 'formation_agenda');

if (!memberList || !agenda) {
  return { error: '선행 문서가 생성되지 않았습니다.' };
}
```

---

## 5. UI/UX 설계

### 5.1 문서 생성 에디터 화면

```
┌──────────────────────────────────────────────────────────┐
│  결성총회 문서 생성                              [4/10]   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📄 결성총회 의사록                                       │
│                                                           │
│  의사록 내용을 검토하고 필요시 수정하세요.                 │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  📋 자동 생성 정보                                  │  │
│  │  ─────────────────────────────────                │  │
│  │  조합명: 프로펠-SNUSV엔젤투자조합1호                │  │
│  │  일시: 2024년 7월 19일 오후 2시                    │  │
│  │  의장: 프로펠벤처스 주식회사 대표이사 정보영, 곽준영│  │
│  │                                                    │  │
│  │  ✏️ 편집 가능 항목                                  │  │
│  │  ─────────────────────────────────                │  │
│  │                                                    │  │
│  │  장소:                                             │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ 업무집행조합원 회의실 (서면으로 진행)     │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │                                                    │  │
│  │  출석 조합원 선택:                                 │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │ [✓] 전체 선택 (22명)                      │    │  │
│  │  │                                           │    │  │
│  │  │ 업무집행조합원:                            │    │  │
│  │  │   [✓] 프로펠벤처스(주) (17좌)             │    │  │
│  │  │   [✓] 김병우 (20좌)                       │    │  │
│  │  │   [✓] 김재우 (33좌)                       │    │  │
│  │  │   ... (스크롤)                            │    │  │
│  │  │                                           │    │  │
│  │  │ 유한책임조합원:                            │    │  │
│  │  │   [✓] 김혜연 (20좌)                       │    │  │
│  │  │   [✓] 넥스큐브코파레이션이선㈜ (100좌)     │    │  │
│  │  │   ... (스크롤)                            │    │  │
│  │  │                                           │    │  │
│  │  │ 선택된 조합원: 22명 / 전체 22명            │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  │                                                    │  │
│  │  의안 심의 결과:                                   │  │
│  │  ┌─────────────────────────────────────────┐     │  │
│  │  │ 제1호 의안: 규약(안) 승인의 건            │     │  │
│  │  │ 결과: [원안대로 승인하다            ▼]   │     │  │
│  │  └─────────────────────────────────────────┘     │  │
│  │  ┌─────────────────────────────────────────┐     │  │
│  │  │ 제2호 의안: 사업계획 승인의 건            │     │  │
│  │  │ 결과: [원안대로 승인하다            ▼]   │     │  │
│  │  └─────────────────────────────────────────┘     │  │
│  │                                                    │  │
│  │  ⓘ 의안 제목과 의장 정보는 '결성총회 의안'에서     │  │
│  │     자동으로 가져옵니다.                           │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  [미리보기 (PDF)]                                         │
│                                                           │
│                             [이전]  [저장 후 다음]        │
└──────────────────────────────────────────────────────────┘
```

### 5.2 미리보기 기능

- PDF 미리보기 버튼 클릭 시
- 현재 입력된 값으로 임시 PDF 생성
- 새 탭 또는 모달에서 표시
- 수정 후 다시 미리보기 가능

### 5.3 검증 규칙

| 항목             | 검증 규칙                  | 에러 메시지                        |
| ---------------- | -------------------------- | ---------------------------------- |
| 장소             | 필수 입력 (최소 1자)       | "총회 장소를 입력해주세요."        |
| 출석 조합원 선택 | 최소 1명 이상 선택         | "출석 조합원을 선택해주세요."      |
| 의안 결과        | 각 의안마다 결과 입력 필수 | "모든 의안의 결과를 입력해주세요." |

### 5.4 출석 조합원 선택 컴포넌트 설계

**컴포넌트명**: `AssemblyAttendanceSelector.tsx`

**재사용성**: 다른 총회 유형(임시총회, 정기총회 등)에서도 재사용 가능

**Props**:

```typescript
interface AssemblyAttendanceSelectorProps {
  members: Member[]; // 전체 조합원 목록
  selectedMemberIds: string[]; // 선택된 조합원 ID 목록
  onSelectionChange: (selectedIds: string[]) => void;
  groupByType?: boolean; // 구분(GP/LP)별로 그룹화 여부 (기본: true)
}
```

**기능**:

- 전체 선택/해제 체크박스
- 구분(업무집행조합원/유한책임조합원)별 그룹화
- 개별 조합원 체크박스
- 선택된 조합원 수 실시간 표시
- 출자좌수 정보 표시

---

## 6. PDF 생성 로직

### 6.1 PDF Generator 파일

**파일명**: `lib/pdf/formation-minutes-generator.ts`

**주요 기능:**

1. 문서 제목 렌더링
2. 섹션별 텍스트 렌더링 (일시, 장소, 출석 현황)
3. 조합원 테이블 렌더링 (2열 구조)
4. 개회선언 텍스트 렌더링 (의장 정보 포함)
5. 의안 심의 결과 렌더링
6. 하단 메시지 및 서명란 렌더링

### 6.2 테이블 렌더링 (조합원 명부와 유사)

- 조합원을 GP(업무집행조합원)와 LP(유한책임조합원)로 구분
- 2열 구조로 표시 (왼쪽/오른쪽에 각각 조합원 배치)
- 가나다순 정렬

```typescript
// 예시 코드
function renderMemberTable(
  doc: PDFKit.PDFDocument,
  members: Member[],
  tableConfig: TableConfig
) {
  const gps = members.filter(m => m.type === '업무집행조합원');
  const lps = members.filter(m => m.type === '유한책임조합원');

  // 2열 구조로 배치
  const leftColumn = [...gps, ...lps.slice(0, Math.ceil(lps.length / 2))];
  const rightColumn = lps.slice(Math.ceil(lps.length / 2));

  // 테이블 헤더 렌더링
  // 각 행 렌더링
  // ...
}
```

### 6.3 PDF Config 파일

**파일명**: `lib/pdf/formation-minutes-config.ts`

```typescript
export const FORMATION_MINUTES_CONFIG = {
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    section_label: { family: '맑은고딕-Bold', size: 12 },
    body: { family: '맑은고딕', size: 11 },
    table_header: { family: '맑은고딕-Bold', size: 9 },
    table_body: { family: '맑은고딕', size: 8 },
  },

  spacing: {
    title_bottom: 3,
    section_spacing: 2,
    paragraph_spacing: 1.5,
  },

  table: {
    row_height: 30,
    header_height: 35,
  },
};
```

---

## 7. API 설계

### 7.1 다음 문서 정보 조회 (기존 API 확장)

```
GET /api/admin/funds/{fundId}/assemblies/{assemblyId}/next-document

Response:
{
  "document_type": "formation_minutes",
  "editable": true,
  "template": {
    "id": "uuid",
    "version": "1.0.0",
    "description": "의사록 내용을 검토하고 필요시 수정하세요."
  },
  "default_content": {
    "location": "업무집행조합원 회의실 (서면으로 진행)",
    "attended_members": 22,
    "agendas": [
      { "index": 1, "title": "규약(안) 승인의 건", "result": "원안대로 승인하다" },
      { "index": 2, "title": "사업계획 승인의 건", "result": "원안대로 승인하다" }
    ]
  },
  "preview_data": {
    "fund_name": "프로펠-SNUSV엔젤투자조합1호",
    "assembly_date": "2024년 7월 19일",
    "all_members": [...],
    "gp_names_full": "프로펠벤처스 주식회사 대표이사 정보영 및 곽준영"
  }
}

**Notes**:
- default_content는 결성총회 의안 문서에서 가져온 정보 기반
- agendas는 의안 문서의 agendas[].title을 가져오고, result는 기본값으로 "원안대로 승인하다"
- total_members는 all_members.length로 계산
```

### 7.2 문서 생성 (기존 API 사용)

```
POST /api/admin/funds/{fundId}/assemblies/{assemblyId}/documents/generate

Body:
{
  "type": "formation_minutes",
  "content": {
    "location": "업무집행조합원 회의실 (서면으로 진행)",
    "attended_members": 22,
    "agendas": [
      { "index": 1, "title": "규약(안) 승인의 건", "result": "원안대로 승인하다" },
      { "index": 2, "title": "사업계획 승인의 건", "result": "원안대로 승인하다" }
    ]
  }
}

Response:
{
  "document": {
    "id": "uuid",
    "type": "formation_minutes",
    "pdf_storage_path": "...",
    "generated_at": "2024-07-20T10:30:00Z"
  },
  "pdf_url": "https://..."
}
```

---

## 8. 데이터베이스 변경

### 8.1 마이그레이션 불필요

- 기존 `assembly_documents` 테이블 사용
- `document_templates` 테이블 사용 (선택적)
- 새로운 테이블이나 컬럼 추가 없음

### 8.2 템플릿 파일 생성

**파일 위치**: `template/formation-minutes-template.json`

**내용**: 섹션 3.2의 템플릿 구조를 JSON 파일로 저장

```json
{
  "type": "formation_minutes",
  "version": "1.0.0",
  "description": "의사록 내용을 검토하고 필요시 수정하세요.",
  "title_template": "{fund_name} 결성총회 의사록",
  "sections": {
    "time": {
      "label": "1. 일시:",
      "value_template": "{assembly_date} {assembly_time}"
    },
    "location": {
      "label": "2. 장소:",
      "default_value": "업무집행조합원 회의실 (서면으로 진행)"
    },
    "attendance": {
      "label": "3. 출자자 및 출석 현황:",
      "template": "총 조합원 {total_members}명 중 {attended_members}명 출석"
    },
    "member_table": {
      "columns": [
        { "key": "type", "label": "구분", "width": 80 },
        { "key": "name", "label": "조합원명", "width": 120 },
        { "key": "units", "label": "총 출자좌수", "width": 80 },
        { "key": "name2", "label": "조합원명", "width": 120 },
        { "key": "units2", "label": "총 출자좌수", "width": 80 }
      ]
    },
    "opening": {
      "label": "4. 개회선언:",
      "template": "업무집행조합원인 {gp_names_full}은 본회의가 규약에 의해 적법하게 성립되었음을 확인하고 개회를 선언하다. 의장은 규약에 따라 공동의장으로 각 업무집행조합원 {gp_names_full}이 맡다. 의장은 조합원 출자좌수의 {attendance_rate}%가 출석하였음을 보고하다. 이어 아래와 같이 의안 심의를 진행하다."
    },
    "agendas": {
      "label": "5. 의안심의",
      "agenda_template": "제{index}호의안: {title}",
      "default_result": "원안대로 승인하다"
    },
    "closing": {
      "template": "상기와 같이 상정된 의안과 결과에 대해 이의가 없음을 확인한 후 의장은 상정된 의안들이 승인되었음을 선언하다. 의장은 이상으로 조합원총회의 목적사항에 대한 심의 및 의결을 종료하였으므로 폐회를 선언하다.\n\n위 의사의 경과요령과 결과를 명확히 하기 위하여 이 의사록을 작성하고 업무집행조합원이 아래와 같이 기명 날인하다."
    },
    "signature": {
      "date_label": "{assembly_date}",
      "fund_name_label": "{fund_name}",
      "gp_label": "업무집행조합원",
      "seal_text": "(인)"
    }
  }
}
```

### 8.3 템플릿 로드 로직

**템플릿 로드 우선순위**:

1. DB에서 활성 템플릿 조회 (`document_templates` 테이블)
2. DB에 없으면 `template/formation-minutes-template.json` 파일 읽기
3. 파일도 없으면 코드 내 하드코딩된 fallback 사용

```typescript
async function getFormationMinutesTemplate(): Promise<FormationMinutesTemplate> {
  try {
    // 1. DB에서 조회
    const dbTemplate = await getActiveTemplateByType('formation_minutes');
    if (dbTemplate) {
      return dbTemplate.content;
    }
  } catch (error) {
    console.warn('DB 템플릿 조회 실패:', error);
  }

  try {
    // 2. JSON 파일에서 읽기
    const filePath = path.join(
      process.cwd(),
      'template/formation-minutes-template.json'
    );
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn('템플릿 파일 읽기 실패:', error);
  }

  // 3. 코드 내 fallback
  return FALLBACK_FORMATION_MINUTES_TEMPLATE;
}
```

### 8.4 DB 마이그레이션 (선택 사항)

관리자가 직접 DB에 템플릿을 추가하고 싶을 경우 사용할 SQL:

```sql
INSERT INTO document_templates (type, version, content, editable, is_active, description, fund_id, created_by)
VALUES (
  'formation_minutes',
  '1.0.0',
  '{ ... template/formation-minutes-template.json 내용 ... }',
  true,
  true,
  '의사록 내용을 검토하고 필요시 수정하세요.',
  NULL,
  NULL
);
```

---

## 9. 타입 정의 확장

### 9.1 types/assemblies.ts 확장

```typescript
// 이미 정의됨: formation_minutes

// FormationMinutesContent 타입 추가
// Note: content는 템플릿 전체 구조를 포함
export interface FormationMinutesContent {
  title_template: string;
  sections: {
    time: {
      label: string;
      value_template: string;
    };
    location: {
      label: string;
      value: string; // 사용자 편집 가능
    };
    attendance: {
      label: string;
      template: string;
      attended_member_ids: string[]; // 사용자 선택 (체크박스)
    };
    member_table: {
      columns: Array<{
        key: string;
        label: string;
        width: number;
      }>;
    };
    opening: {
      label: string;
      template: string;
    };
    agendas: {
      label: string;
      agenda_template: string;
      items: MinutesAgendaItem[]; // 사용자 편집 가능 (result 필드)
    };
    closing: {
      template: string;
    };
    signature: {
      date_label: string;
      fund_name_label: string;
      gp_label: string;
      seal_text: string;
    };
  };
}

export interface MinutesAgendaItem {
  index: number; // 의안 번호
  title: string; // 의안 제목 (의안 문서에서 가져옴)
  result: string; // 승인 결과 (편집 가능)
}

// AssemblyDocumentContent 인터페이스 확장
export interface AssemblyDocumentContent {
  // ...
  formation_minutes?: FormationMinutesContent;
}
```

---

## 10. 구현 순서

### Phase 1: 준비 및 설정 (30분)

- [ ] 타입 정의 추가 (`types/assemblies.ts`)
- [ ] 템플릿 JSON 파일 생성 (`template/formation-minutes-template.json`)
- [ ] 템플릿 로드 함수 작성 (DB 우선, fallback으로 JSON 파일)

### Phase 2: PDF Generator 구현 (2시간)

- [ ] `lib/pdf/formation-minutes-config.ts` 생성 (스타일 설정)
- [ ] `lib/pdf/formation-minutes-generator.ts` 생성
  - [ ] 제목 렌더링
  - [ ] 일시/장소/출석 현황 렌더링
  - [ ] 조합원 테이블 렌더링 (2열 구조)
  - [ ] 개회선언 텍스트 렌더링
  - [ ] 의안 심의 결과 렌더링
  - [ ] 하단 메시지 및 서명란 렌더링
- [ ] PDF 생성 테스트

### Phase 3: 백엔드 로직 구현 (1.5시간)

- [ ] `lib/admin/assembly-documents.ts` 수정
  - [ ] `formation_minutes` 타입 지원 추가
  - [ ] 선행 문서 의존성 체크 로직 추가
  - [ ] 의안 문서에서 의장/의안 정보 추출
  - [ ] context 생성 로직 추가 (조합원 목록, GP 정보 등)
- [ ] `components/admin/assembly-documents/index.ts` 수정
  - [ ] `formation_minutes` 에디터 설정 추가

### Phase 4: API 수정 (1시간)

- [ ] `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/next-document/route.ts`
  - [ ] `formation_minutes` 생성 시 default_content 생성 로직
  - [ ] 선행 문서 확인 로직
- [ ] `app/api/admin/funds/[fundId]/assemblies/[assemblyId]/documents/generate/route.ts`
  - [ ] `formation_minutes` PDF 생성 호출
  - [ ] content + context 분리 저장

### Phase 5: 프론트엔드 UI 구현 (3시간)

- [ ] 재사용 가능한 출석 선택 컴포넌트: `components/admin/AssemblyAttendanceSelector.tsx`
  - [ ] 전체 선택/해제 체크박스
  - [ ] 구분(GP/LP)별 그룹화
  - [ ] 개별 조합원 체크박스
  - [ ] 선택된 조합원 수 실시간 표시
  - [ ] 다른 총회 유형에서도 재사용 가능하도록 설계
- [ ] 에디터 컴포넌트 생성: `components/admin/assembly-documents/FormationMinutesEditor.tsx`
  - [ ] 장소 입력 필드
  - [ ] 출석 조합원 선택 컴포넌트 통합
  - [ ] 의안별 결과 선택 드롭다운
  - [ ] 자동 생성 정보 표시 (읽기 전용)
  - [ ] 검증 로직
- [ ] `AssemblyDocumentGenerationModal.tsx`에 통합
- [ ] 미리보기 기능 연동

### Phase 6: 테스트 및 검증 (1시간)

- [ ] 단위 테스트
  - [ ] PDF 생성 테스트 (샘플 데이터)
  - [ ] 템플릿 변수 치환 테스트
  - [ ] 테이블 렌더링 테스트
- [ ] 통합 테스트
  - [ ] 문서 생성 전체 플로우 테스트
  - [ ] 선행 문서 의존성 확인
  - [ ] 에러 처리 확인
- [ ] UI/UX 테스트
  - [ ] 에디터 동작 확인
  - [ ] 미리보기 확인
  - [ ] 검증 메시지 확인

**예상 총 소요 시간: 약 9시간** (출석 선택 컴포넌트 추가로 +1시간)

---

## 11. 주의사항

### 11.1 의안 정보 동기화

- 의사록은 의안 문서의 내용을 참조하므로, **의안 수정 후 의사록을 재생성해야 함**
- 의안 수정 시 경고 메시지 표시: "의사록이 이미 생성되었습니다. 의안 수정 후 의사록을 재생성해야 합니다."

### 11.2 Content + Context 설계

- **content**: 템플릿 전체 구조 + 사용자 편집 값
  - 템플릿이 없어도 content만으로 문서 구조 파악 가능
  - 사용자 편집 가능 필드: `sections.location.value`, `sections.attendance.attended_member_ids`, `sections.agendas.items[].result`
- **context**: 템플릿 변수에 들어갈 실제 데이터
  - `fund_name`, `assembly_date`, `all_members`, `attended_members_data`, `gp_names_full` 등
  - DB에서 조회한 스냅샷
- **결합**: content + context = 완전한 문서

### 11.3 조합원 테이블 2열 구조

- 조합원 수가 홀수일 경우 왼쪽 열에 하나 더 배치
- GP는 항상 먼저 표시, 그 다음 LP 표시
- 각 그룹 내에서는 가나다순 정렬

### 11.4 의장 정보 처리

- 의안에서 chairman 필드 파싱 필요
- 예: "업무집행조합원 프로펠벤처스 주식회사 대표이사 정보영, 곽준영"
- GP가 여러 명인 경우 모두 나열

### 11.5 출석률 계산

- PDF 생성 시 실시간으로 계산: `(attended_members_data.length / all_members.length) * 100`
- 소수점 첫째 자리까지 표시 (예: 100.0%)
- context에 저장하지 않고 필요할 때마다 계산

---

## 12. 향후 확장 계획

### 12.1 Phase 2: 추가 기능

- [ ] 의안별 상세 논의 내용 추가 (선택 사항)
- [ ] 서명 이미지 추가 (디지털 서명)
- [ ] 출석 조합원 선택 히스토리 (이전 총회 출석 기록 참고)

### 12.2 Phase 3: 자동화

- [ ] 의안 승인 후 자동으로 의사록 초안 생성
- [ ] 이메일 발송 시 의사록 자동 첨부

---

## 13. 참고 자료

### 13.1 관련 문서

- `ASSEMBLY_FEATURE_DESIGN.md` - 조합원 총회 전체 기능 설계
- `ASSEMBLY_TEMPLATE_SYSTEM_DESIGN.md` - 템플릿 시스템 설계
- `types/assemblies.ts` - 타입 정의

### 13.2 유사 문서

- 조합원 명부 (`formation_member_list`) - 테이블 렌더링 참고
- 결성총회 의안 (`formation_agenda`) - 의안 구조 참고

---

## 14. 정리

### 14.1 핵심 포인트

✅ **반자동 생성**: 대부분의 내용은 자동 생성, 출석자 선택 및 의안 결과만 확인/수정  
✅ **의안 의존성**: 의안 문서에서 의장 및 의안 목록 자동으로 가져옴 (편집 불가)  
✅ **출석 관리**: 체크박스로 출석 조합원 선택, 재사용 가능한 컴포넌트 설계  
✅ **템플릿 관리**: DB 또는 JSON 파일에서 템플릿 로드, fallback 지원  
✅ **문서 복원**: content(템플릿 전체) + context(변수 데이터) 분리 저장으로 완벽 복원 가능  
✅ **확장성**: 다른 총회 유형의 의사록에도 동일한 구조 및 컴포넌트 재사용 가능

### 14.2 구현 우선순위

1. 🔴 **높음**: PDF Generator, 백엔드 로직, API
2. 🟡 **중간**: 프론트엔드 에디터
3. 🟢 **낮음**: 고급 기능 (자동화, 서명 이미지 등)

---

**기획 문서 작성일**: 2024년 10월 23일  
**작성자**: AI Assistant  
**버전**: 1.0
