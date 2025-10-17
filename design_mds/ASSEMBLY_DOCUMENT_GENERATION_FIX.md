# 조합원 총회 문서 생성 플로우 수정

## 문제점

현재 "생성" 버튼을 누르면 즉시 DB에 문서 정보가 저장됩니다.

- 미리보기 → 다시 편집 → 재생성 시 duplicate key 오류 발생
- `assembly_documents` 테이블의 `(assembly_id, type)` unique constraint 위반

## 최종 해결 방안

1. **생성 단계**: PDF Buffer만 생성 (Storage/DB 저장 안 함)
2. **미리보기 단계**: Blob URL로 미리보기 표시
3. **확인 단계**: 사용자가 "다음" 버튼을 누를 때 PDF 재생성 → Storage 업로드 → DB 저장

### 장점

- ✅ Orphan Storage 파일 문제 완전 해결
- ✅ 코드 복잡도 감소
- ✅ 상태 관리 간소화
- ✅ "다시 편집" 시 중복 생성 문제 없음

## 구현 변경사항

### 1. Backend (`lib/admin/assembly-documents.ts`)

- `generateMemberListBuffer()`: 조합원 명부 PDF Buffer 생성 (Storage 업로드 안 함)
- `generateFormationAgendaBuffer()`: 의안 PDF Buffer 생성 (Storage 업로드 안 함)
- `generateAssemblyDocumentBuffer()`: 문서 타입에 따라 PDF Buffer만 반환
- `saveAssemblyDocument()`: PDF 재생성 → Storage 업로드 → DB 저장 (기존 문서 자동 삭제)

### 2. API 엔드포인트

- `POST .../documents/generate` - PDF Buffer를 Base64로 인코딩하여 반환
- `POST .../documents/save` - Content 받아서 PDF 재생성 후 Storage/DB 저장
- ~~`POST .../documents/preview-storage`~~ - 삭제 (불필요)

### 3. Frontend (`AssemblyCreationModal.tsx`)

1. **"생성" 클릭**

   - `generate` API 호출
   - Base64 PDF를 Blob으로 변환
   - `URL.createObjectURL()`로 Blob URL 생성
   - iframe에 표시

2. **"다시 편집" 클릭**

   - `URL.revokeObjectURL()` 호출
   - 상태 초기화
   - 편집 화면으로 복귀

3. **"다음" 클릭**
   - `save` API 호출 (content 전달)
   - API에서 PDF 재생성 → Storage 업로드 → DB 저장
   - Blob URL 정리 및 다음 문서로 이동

### 4. 메모리 관리

- Blob URL은 사용 후 `URL.revokeObjectURL()`로 정리
- 컴포넌트 언마운트 시에도 정리 (`handleClose`)

## 성능 고려사항

- PDF를 두 번 생성하지만 (미리보기, 저장) 각 생성이 2-3초 정도로 빠르므로 문제없음
- 사용자는 "저장 중"이라고 명확히 인지 가능
- Storage 관리의 복잡도 제거로 얻는 이득이 훨씬 큼

## 플로우 다이어그램

```
[편집 화면]
    ↓ "생성" 클릭
[PDF Buffer 생성 (메모리만)]
    ↓
[Blob URL 생성 & 미리보기]
    ↓
[사용자 확인]
    ├─ "다시 편집" → Blob URL 삭제 → [편집 화면]
    └─ "다음" → PDF 재생성 → Storage 업로드 → DB 저장 → Blob URL 삭제 → [다음 문서]
```
