import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Stats } from '@/lib/admin/dashboard';
import { DollarSign, TrendingUp, UserCheck, Users } from 'lucide-react';

interface StatsCardsProps {
  stats: Stats;
  isLoading?: boolean;
}

export default function StatsCards({ stats, isLoading = false }: StatsCardsProps) {
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
