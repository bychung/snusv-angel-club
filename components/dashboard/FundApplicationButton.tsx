'use client';

import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Fund {
  id: string;
  name: string;
}

export default function FundApplicationButton() {
  const [fund, setFund] = useState<Fund | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisplayFund = async () => {
      try {
        // 서버에서 자동으로 인증 상태를 확인하고 신청한 펀드를 제외
        const response = await fetch('/api/funds/display?location=dashboard');
        const data = await response.json();
        setFund(data.fund);
      } catch (error) {
        console.error('펀드 정보 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisplayFund();
  }, []);

  // 로딩 중이거나 노출할 펀드가 없는 경우 아무것도 렌더링하지 않음
  if (loading || !fund) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <Link href={`/survey?fund_id=${fund.id}`}>
        <Button
          size="lg"
          className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 shadow-2xl shadow-cyan-500/30 backdrop-blur-sm px-8 py-4 text-base font-semibold rounded-full hover:scale-105 transition-all duration-300"
        >
          {fund.name} 출자 신청하기
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  );
}
