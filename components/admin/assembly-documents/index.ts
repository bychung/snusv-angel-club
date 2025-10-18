import type { AssemblyDocumentType } from '@/types/assemblies';
import FormationAgendaEditor from './FormationAgendaEditor';
import FormationMemberListEditor from './FormationMemberListEditor';
import type { DocumentEditorConfig } from './types';

/**
 * 문서 타입별 에디터 설정 레지스트리
 * 새로운 문서 타입을 추가할 때는 여기에 등록만 하면 됨
 */
export const DOCUMENT_EDITORS: Record<
  AssemblyDocumentType,
  DocumentEditorConfig
> = {
  // === 결성총회 문서 ===
  formation_member_list: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor,
    description:
      '이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로 생성됩니다.',
  },

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
          content:
            '당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행',
        },
      ],
    }),
    validate: content => {
      if (!content.chairman?.trim()) {
        return '의장을 입력해주세요.';
      }
      return null;
    },
    EditorComponent: FormationAgendaEditor,
    description: '의안 내용을 검토하고 필요시 수정하세요.',
  },

  // === 향후 추가될 문서 타입 (placeholder) ===
  formation_official_letter: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  formation_minutes: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  fund_registration_application: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  investment_certificate: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  seal_registration: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  member_consent: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  personal_info_consent: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  // === 임시총회 문서 ===
  special_agenda: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  special_minutes: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  // === 정기총회 문서 ===
  regular_agenda: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  regular_minutes: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  // === 해산/청산총회 문서 ===
  dissolution_agenda: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },

  dissolution_minutes: {
    requiresInput: false,
    getDefaultContent: () => ({}),
    EditorComponent: FormationMemberListEditor, // TODO: 나중에 교체
    description: '(준비 중)',
  },
};

/**
 * 문서 타입에 해당하는 에디터 설정을 반환
 */
export function getEditorConfig(
  documentType: AssemblyDocumentType
): DocumentEditorConfig | null {
  return DOCUMENT_EDITORS[documentType] || null;
}
