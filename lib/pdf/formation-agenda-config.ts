/**
 * 결성총회 의안 PDF 스타일 설정
 * 템플릿 시스템: 레이블과 내용은 DB 템플릿에서, 스타일은 여기서 관리
 */

export const FORMATION_AGENDA_CONFIG = {
  // 폰트 설정
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    section_header: { family: '맑은고딕-Bold', size: 12 },
    date_chairman: { family: '맑은고딕', size: 14 },
    agenda_title: { family: '맑은고딕-Bold', size: 11 },
    agenda_content: { family: '맑은고딕', size: 10 },
    footer: { family: '맑은고딕', size: 12 },
  },

  // 간격 설정
  spacing: {
    title_bottom: 3, // 제목 아래 간격
    section_spacing: 2, // 섹션 간 간격
    agenda_title_bottom: 0.5, // 의안 제목 아래 간격
    agenda_spacing: 2.5, // 의안 사이 간격
    content_line_spacing: 0.3, // 의안 내용 줄 간격
    footer_top: 4, // 하단 메시지 위 간격
    footer_spacing: 0.5, // 하단 메시지 위쪽 간격
  },

  // 페이지 설정
  page: {
    size: 'A4' as const,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    maxY: 700, // 페이지 넘김 기준 Y 좌표
  },

  // 정렬 설정
  alignment: {
    title: 'center' as const,
    section: 'left' as const,
    content: 'left' as const,
  },
};

export type FormationAgendaConfig = typeof FORMATION_AGENDA_CONFIG;
