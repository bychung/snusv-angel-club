import OtherHomepage from '@/components/homepages/PropelHomepage';
import { getBrandingConfig } from '@/lib/branding';
import dynamic from 'next/dynamic';

// 동적 임포트로 각 홈페이지 컴포넌트 로드 (빌드 최적화)
const SnusvHomepage = dynamic(
  () => import('@/components/homepages/SnusvHomepage'),
  {
    loading: () => <div>Loading...</div>,
  }
);

const PropelHomepage = dynamic(
  () => import('@/components/homepages/PropelHomepage'),
  {
    loading: () => <div>Loading...</div>,
  }
);

export default function HomePage() {
  const branding = getBrandingConfig();

  // 브랜드별 홈페이지 컴포넌트 렌더링
  if (branding.brandKey === 'snusv') {
    return <SnusvHomepage />;
  } else if (branding.brandKey === 'propel') {
    return <OtherHomepage />;
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">잘못된 접근입니다</h1>
          <p className="text-gray-600 mt-2">올바르지 않은 브랜드 설정입니다.</p>
        </div>
      </div>
    );
  }
}
