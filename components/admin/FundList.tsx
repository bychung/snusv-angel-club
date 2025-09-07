'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import type { Fund, FundMember, Profile } from '@/types/database';
import { Building, Users, TrendingUp, ChevronRight, Link2, Check, Plus } from 'lucide-react';
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
  const [copiedFundId, setCopiedFundId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [newFundAbbreviation, setNewFundAbbreviation] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
        const totalInvestment = members.reduce((sum: number, member: any) => sum + member.investment_units, 0);
        const registeredMembers = members.filter((member: any) => member.profile?.user_id).length;
        const surveyOnlyMembers = members.filter((member: any) => !member.profile?.user_id).length;

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

  const copySurveyLink = async (fundId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const baseUrl = window.location.origin;
      const surveyUrl = `${baseUrl}/survey?fund_id=${fundId}`;
      await navigator.clipboard.writeText(surveyUrl);
      
      setCopiedFundId(fundId);
      setTimeout(() => setCopiedFundId(null), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
    }
  };

  const handleCreateFund = async () => {
    if (!newFundName.trim()) return;

    setIsCreating(true);
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('funds')
        .insert([
          { 
            name: newFundName.trim(),
            abbreviation: newFundAbbreviation.trim() || null
          }
        ])
        .select();

      if (error) throw error;

      // 펀드 목록 새로고침
      await fetchFunds();
      
      // 다이얼로그 닫기 및 폼 리셋
      setIsAddDialogOpen(false);
      setNewFundName('');
      setNewFundAbbreviation('');
    } catch (error) {
      console.error('펀드 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
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
    <div className="space-y-6">
      {/* 펀드 추가 버튼 */}
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              펀드 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 펀드 추가</DialogTitle>
              <DialogDescription>
                새로운 펀드를 생성합니다. 펀드 정보를 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fundName" className="text-right">
                  펀드명 *
                </Label>
                <Input
                  id="fundName"
                  value={newFundName}
                  onChange={(e) => setNewFundName(e.target.value)}
                  className="col-span-3"
                  placeholder="펀드 이름을 입력하세요"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fundAbbreviation" className="text-right">
                  펀드 약칭
                </Label>
                <Input
                  id="fundAbbreviation"
                  value={newFundAbbreviation}
                  onChange={(e) => setNewFundAbbreviation(e.target.value)}
                  className="col-span-3"
                  placeholder="펀드 약칭을 입력하세요 (예: 블라인드2호)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFund();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateFund} disabled={isCreating || !newFundName.trim()}>
                {isCreating ? '생성 중...' : '펀드 생성'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 펀드 목록 */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => copySurveyLink(fund.id, e)}
                  >
                    {copiedFundId === fund.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        설문조사 링크 복사
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
      </div>
    </div>
  );
}