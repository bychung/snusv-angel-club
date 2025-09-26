export interface BrandingConfig {
  // 기본 정보
  clubName: string;
  clubNameShort: string;
  description: string;
  domain: string;

  // 메타데이터
  title: string;
  ogTitle: string;
  ogDescription: string;

  // 연락처
  email: string;

  // 챗봇
  chatbotSlug?: string;

  // 브랜드 식별자
  brandKey: string;
}

// 브랜드별 설정
const brandConfigs = {
  snusv: {
    clubName: 'SNUSV ANGEL CLUB',
    clubNameShort: 'SNUSV',
    description:
      '서울대학교 학생 벤처 네트워크 동아리(SNUSV) Alumni 기반의 엔젤클럽으로, 후배 스타트업을 지원하며 함께 미래를 만들어가는 투자 생태계를 구축합니다.',
    domain: 'https://snusv.angel-club.kr',
    title: 'SNUSV 엔젤클럽',
    ogTitle: 'SNUSV 엔젤클럽',
    ogDescription: '서울대 벤처창업동아리 SNUSV Alumni 기반의 엔젤클럽',
    email: 'snusv@angel-club.kr',
    chatbotSlug: '3um3',
    brandKey: 'snusv',
  },
  propel: {
    clubName: 'PROPEL VENTURES',
    clubNameShort: 'PROPEL',
    description: '컴퍼니빌딩과 엑셀러레이팅을 전문적으로 지원하는 투자사',
    domain: 'https://propel.kr',
    title: '프로펠벤처스',
    ogTitle: '프로펠벤처스',
    ogDescription: '혁신적인 스타트업 생태계를 함께 만들어가는 엔젤클럽',
    email: 'help@propel.kr',
    brandKey: 'propel',
  },
} as const;

// 브랜딩 설정 가져오기
export function getBrandingConfig(): BrandingConfig {
  const brand = process.env.NEXT_PUBLIC_BRAND as keyof typeof brandConfigs;
  return brandConfigs[brand] || brandConfigs.snusv;
}

// 현재 브랜드 키 가져오기
export function getCurrentBrand(): string {
  return getBrandingConfig().brandKey;
}
