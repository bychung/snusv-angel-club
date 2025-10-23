import type { AssemblyDocumentType } from '@/types/assemblies';

/**
 * 문서 에디터 컴포넌트의 공통 Props 인터페이스
 */
export interface DocumentEditorProps<T = any> {
  // 문서 내용
  content: T;
  onContentChange: (content: T) => void;

  // 상태
  isLoading: boolean;
  error: string | null;
  readOnly?: boolean;

  // 메타 정보
  fundId: string;
  assemblyId: string;
  documentType: AssemblyDocumentType;

  // 추가 데이터 (optional)
  allMembers?: any[]; // 출석 선택 등에 사용
}

/**
 * 문서 에디터 설정 인터페이스
 */
export interface DocumentEditorConfig {
  // 사용자 입력이 필요한지
  requiresInput: boolean;

  // 기본 컨텐츠 생성 함수
  getDefaultContent: () => any;

  // 유효성 검사 함수
  validate?: (content: any) => string | null;

  // 편집기 컴포넌트
  EditorComponent: React.ComponentType<DocumentEditorProps>;

  // 안내 메시지
  description?: string;
}
