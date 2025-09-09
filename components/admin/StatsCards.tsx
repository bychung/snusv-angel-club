'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Stats {
  totalUsers: number;
  totalInvestment: number;
  totalUnits: number;
  registeredUsers: number;
}

export default function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalInvestment: 0,
    totalUnits: 0,
    registeredUsers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const supabase = createClient();

      // 전체 프로필 수
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // 회원가입한 사용자 수 (user_id가 있는 경우)
      const { count: registeredUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .not('user_id', 'is', null);

      // 총 출자 정보
      const { data: fundData } = await supabase.from('fund_members').select('investment_units');

      const totalUnits = fundData?.reduce((sum, item) => sum + item.investment_units, 0) || 0;
      const totalInvestment = totalUnits * 1000000; // 1좌당 100만원

      setStats({
        totalUsers: totalUsers || 0,
        totalInvestment,
        totalUnits,
        registeredUsers: registeredUsers || 0,
      });
    } catch (error) {
      console.error('통계 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    {
      title: '총 참여자 수',
      value: stats.totalUsers,
      icon: Users,
      description: '출자 의향 설문 참여자 수',
      color: 'text-blue-600',
    },
    {
      title: '회원가입자 수',
      value: stats.registeredUsers,
      icon: UserCheck,
      description: '실제 가입 완료자',
      color: 'text-green-600',
    },
    {
      title: '총 출자좌수',
      value: stats.totalUnits,
      icon: TrendingUp,
      description: '전체 출자좌수',
      color: 'text-purple-600',
      suffix: '좌',
    },
    {
      title: '총 출자금액',
      value: stats.totalInvestment,
      icon: DollarSign,
      description: '전체 출자금액',
      color: 'text-orange-600',
      format: 'currency',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;

        const formatValue = (value: number) => {
          if (card.format === 'currency') {
            return `${(value / 100000000).toFixed(1)}억원`;
          }
          return `${value.toLocaleString()}${card.suffix || ''}`;
        };

        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                ) : (
                  formatValue(card.value)
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
