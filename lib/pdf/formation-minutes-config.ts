/**
 * 결성총회 의사록 PDF 스타일 설정
 * 템플릿 시스템: 레이블과 내용은 DB 템플릿에서, 스타일은 여기서 관리
 */

export const FORMATION_MINUTES_CONFIG = {
  // 폰트 설정
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    section_label: { family: '맑은고딕-Bold', size: 12 },
    body: { family: '맑은고딕', size: 11 },
    table_header: { family: '맑은고딕-Bold', size: 9 },
    table_body: { family: '맑은고딕', size: 8 },
    signature: { family: '맑은고딕', size: 11 },
  },

  // 간격 설정
  spacing: {
    title_bottom: 3, // 제목 아래 간격
    section_spacing: 2, // 섹션 간 간격
    paragraph_spacing: 1.5, // 문단 간격
    agenda_spacing: 1.5, // 의안 간격
    closing_top: 2, // 폐회 선언 위 간격
    signature_top: 4, // 서명란 위 간격
  },

  // 테이블 스타일
  table_style: {
    row_height: 30,
    header_height: 35,
    zebra_striping: true, // 줄무늬 배경
    zebra_colors: {
      even: '#fafafa',
      odd: '#ffffff',
    },
    header_background: '#f0f0f0',
    border_color: '#cccccc',
    border_width: 0.5,
  },

  // 페이지 설정
  page: {
    size: 'A4' as const,
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    maxY: 700, // 페이지 넘김 기준 Y 좌표
    table_left: 70,
    table_width: 455, // A4 width - margins (70+70)
  },

  // 정렬 설정
  alignment: {
    title: 'center' as const,
    section: 'left' as const,
    signature: 'right' as const,
  },
};

export type FormationMinutesConfig = typeof FORMATION_MINUTES_CONFIG;
