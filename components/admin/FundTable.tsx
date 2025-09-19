import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { FundWithStats } from '@/lib/admin/funds';
import { Building, Settings, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import FundActions from './FundActions';

interface FundTableProps {
  funds: FundWithStats[];
}

export default function FundTable({ funds }: FundTableProps) {
  const formatCurrency = (amount: number) => {
    return (amount * 1000000).toLocaleString() + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTotalStats = () => {
    return funds.reduce(
      (totals, fund) => ({
        totalFunds: totals.totalFunds + 1,
        totalMembers: totals.totalMembers + fund.memberCount,
        totalInvestment: totals.totalInvestment + fund.totalInvestment,
      }),
      { totalFunds: 0, totalMembers: 0, totalInvestment: 0 }
    );
  };

  const stats = getTotalStats();

  if (funds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-500">
            등록된 펀드가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 전체 통계 카드 - 크기 축소 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-1 px-3">
            <div className="flex items-center">
              <Building className="h-6 w-6 text-blue-500" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-500">총 펀드 수</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.totalFunds}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-1 px-3">
            <div className="flex items-center">
              <Users className="h-6 w-6 text-green-500" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-500">
                  총 조합원 수
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.totalMembers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-1 px-3">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-indigo-500" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-500">총 출자금액</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stats.totalInvestment)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 펀드 목록 - 기존 카드 형태 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funds.map(fund => (
          <Card key={fund.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {fund.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500 flex items-center gap-2">
                      <span>등록일: {formatDate(fund.created_at)}</span>
                      {fund.abbreviation && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-blue-100 text-blue-800"
                        >
                          {fund.abbreviation}
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* 조합원 수 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      총 조합원
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {fund.memberCount.toLocaleString()}명
                  </span>
                </div>

                {/* 총 출자금액 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      총 출자금액
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(fund.totalInvestment)}
                  </span>
                </div>

                {/* 가입 현황 */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-center mb-3">
                    <div>
                      <div className="text-sm font-semibold text-green-600">
                        {fund.registeredMembers}
                      </div>
                      <div className="text-xs text-gray-500">가입완료</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-yellow-600">
                        {fund.surveyOnlyMembers}
                      </div>
                      <div className="text-xs text-gray-500">설문만</div>
                    </div>
                  </div>

                  {/* 설문조사 링크 복사 버튼 */}
                  <FundActions fund={fund} />

                  {/* 관리 버튼들 */}
                  <div className="pt-3 border-t border-gray-100 mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Link href={`/admin/funds/${fund.id}`}>
                        <button className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                          <Users className="h-3 w-3" />
                          조합원 관리
                        </button>
                      </Link>
                      <Link href={`/admin/funds/${fund.id}/manage`}>
                        <button className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                          <Settings className="h-3 w-3" />
                          펀드 관리
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
