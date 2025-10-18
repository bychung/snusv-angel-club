/**
 * 조합원 명부 PDF 스타일 설정
 * 템플릿 시스템: 레이블과 테이블 구조는 DB 템플릿에서, 스타일은 여기서 관리
 */

export const MEMBER_LIST_CONFIG = {
  // 폰트 설정
  fonts: {
    title: { family: '맑은고딕-Bold', size: 18 },
    date: { family: '맑은고딕', size: 12 },
    fund_name: { family: '맑은고딕-Bold', size: 16 },
    gp: { family: '맑은고딕', size: 12 },
    table_header: { family: '맑은고딕-Bold', size: 9 },
    table_body: { family: '맑은고딕', size: 8 },
  },

  // 테이블 스타일
  table_style: {
    row_height: 30,
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
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    maxY: 700, // 페이지 넘김 기준 Y 좌표
    table_left: 50,
    table_width: 495, // A4 width - margins
  },

  // 간격 설정
  spacing: {
    title_bottom: 2,
    table_bottom: 3,
    gp_spacing: 1,
  },
};

export type MemberListConfig = typeof MEMBER_LIST_CONFIG;
