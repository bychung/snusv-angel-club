import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
          {/* 메인 타이틀 */}
          <h1 className="text-4xl md:text-6xl font-bold text-center text-gray-900">
            SNUSV ANGEL CLUB
          </h1>

          {/* 서브 타이틀 */}
          <p className="text-lg md:text-xl text-center text-gray-600 max-w-2xl">
            벤처 펀드 출자를 위한 조합원 정보 수집 플랫폼
          </p>

          {/* 버튼 섹션 */}
          <div className="flex gap-4 mt-8">
            <Link href="/survey">
              <Button size="lg" className="text-lg px-8 py-6">
                설문조사 시작하기
              </Button>
            </Link>

            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                로그인
              </Button>
            </Link>
          </div>

          {/* 펀드 정보 */}
          <div className="mt-16 p-6 bg-white rounded-lg shadow-md max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">현재 모집 중인 펀드</h3>
            <p className="text-gray-600">프로펠-SNUSV엔젤투자조합2호</p>
            <p className="text-sm text-gray-500 mt-2">출자금액: 1백만원당 1좌</p>
          </div>
        </div>
      </div>
    </div>
  );
}
