'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import type { Fund, FundMember, Profile } from '@/types/database';
import { Building, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FundWithStats extends Fund {
  memberCount: number;
  totalInvestment: number;
  registeredMembers: number;
  surveyOnlyMembers: number;
}

export default function FundList() {
  const [funds, setFunds] = useState<FundWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFunds();
  }, []);

  const fetchFunds = async () => {
    try {
      const supabase = createClient();

      // 펀드 목록과 관련 통계 조회
      const { data: fundsData, error } = await supabase
        .from('funds')
        .select(`
          *,
          fund_members (
            id,
            investment_units,
            profile:profiles (
              id,
              user_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 각 펀드별 통계 계산
      const fundsWithStats: FundWithStats[] = fundsData?.map(fund => {
        const members = fund.fund_members || [];
        const totalInvestment = members.reduce((sum, member) => sum + member.investment_units, 0);
        const registeredMembers = members.filter(member => member.profile?.user_id).length;
        const surveyOnlyMembers = members.filter(member => !member.profile?.user_id).length;

        return {
          ...fund,
          memberCount: members.length,
          totalInvestment,
          registeredMembers,
          surveyOnlyMembers,
        };
      }) || [];

      setFunds(fundsWithStats);
    } catch (error) {
      console.error('펀드 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return (amount * 1000000).toLocaleString() + '원';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 펀드가 없습니다</h3>
            <p className="text-gray-600">펀드를 먼저 등록해주세요.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {funds.map(fund => (
        <Card key={fund.id} className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href={`/admin/funds/${fund.id}`}>
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
                    <CardDescription className="text-sm text-gray-500">
                      등록일: {new Date(fund.created_at).toLocaleDateString('ko-KR')}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* 조합원 수 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">총 조합원</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {fund.memberCount.toLocaleString()}명
                  </span>
                </div>

                {/* 총 투자금액 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">총 출자금액</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(fund.totalInvestment)}
                  </span>
                </div>

                {/* 가입 현황 */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-center">
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
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}