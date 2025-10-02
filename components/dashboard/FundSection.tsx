'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { FundStatus } from '@/lib/fund-status';
import { createBrandClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Building, Calendar, Edit2, Save, TrendingUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import FundDetailCard from './FundDetailCard';

interface Fund {
  id: string;
  name: string;
  par_value: number;
  status: FundStatus;
  abbreviation?: string;
  membership: {
    id: string;
    investment_units: number;
    total_units: number;
    profile_id: string;
    created_at: string;
    updated_at: string;
  };
}

export default function FundSection() {
  const { profile, isLoading: authLoading } = useAuthStore();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMembershipId, setEditingMembershipId] = useState<string | null>(
    null
  );
  const [editUnits, setEditUnits] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchFunds();
    }
  }, [profile]);

  const fetchFunds = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      // 서버 API를 통해 내가 출자한 펀드 목록 조회 (profile_permissions 지원)
      const response = await fetch('/api/funds');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '펀드 목록을 불러오는데 실패했습니다');
      }

      setFunds(result.funds || []);
    } catch (error) {
      console.error('펀드 정보 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (fund: Fund) => {
    setEditingMembershipId(fund.membership.id);
    setEditUnits(fund.membership.total_units || 0);
  };

  const handleCancel = () => {
    setEditingMembershipId(null);
    setEditUnits(0);
  };

  const handleSave = async () => {
    if (!profile || !editingMembershipId) return;

    try {
      const brandClient = createBrandClient();

      // 현재 펀드 정보 찾기
      const currentFund = funds.find(
        f => f.membership.id === editingMembershipId
      );
      if (!currentFund) return;

      const oldTotalUnits = currentFund.membership.total_units;

      // 변경이 있는 경우에만 업데이트 및 이력 저장
      if (editUnits !== oldTotalUnits) {
        // 1. fund_members 업데이트
        const { error } = await brandClient.fundMembers
          .update({
            total_units: editUnits,
            updated_by: profile.id, // 본인이 수정
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMembershipId);

        if (error) throw error;

        // 2. 변경 이력 저장
        const { error: changeHistoryError } =
          await brandClient.fundMemberChanges.insert({
            fund_member_id: editingMembershipId,
            changed_by: profile.id, // 본인이 수정
            field_name: 'total_units',
            old_value: oldTotalUnits.toString(),
            new_value: editUnits.toString(),
          });

        if (changeHistoryError) {
          console.error('변경 이력 저장 실패:', changeHistoryError);
          // 이력 저장 실패는 치명적이지 않으므로 계속 진행
        }
      }

      // 정보 다시 가져오기
      await fetchFunds();
      setEditingMembershipId(null);
    } catch (error) {
      console.error('펀드 정보 업데이트 실패:', error);
    }
  };

  const formatCurrency = (amount: number, parValue: number) => {
    return (amount * parValue).toLocaleString() + '원';
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6" />
          <h3 className="text-xl font-semibold">펀드 투자 정보</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(2)].map((_, i) => (
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
      </div>
    );
  }

  if (funds.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-6 w-6" />
          <h3 className="text-xl font-semibold">펀드 출자 정보</h3>
        </div>
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                출자 중인 펀드가 없습니다
              </h3>
              <p className="text-gray-600">
                펀드에 출자하시면 여기에 출자 정보가 표시됩니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6" />
        <h3 className="text-xl font-semibold">펀드 출자 정보</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
        {funds.map(fund => {
          const isEditing = editingMembershipId === fund.membership.id;
          const canEdit =
            fund.status === 'ready' || fund.status === 'processing';

          // 편집 중이 아닐 때는 새로운 상세 카드 사용
          if (!isEditing) {
            return (
              <div key={fund.membership.id} className="relative">
                <FundDetailCard
                  fundId={fund.id}
                  fundName={fund.name || '펀드명 불명'}
                  investmentInfo={{
                    totalUnits: fund.membership.total_units,
                    totalAmount: fund.membership.total_units * fund.par_value,
                    currentUnits: fund.membership.investment_units,
                    currentAmount:
                      fund.membership.investment_units * fund.par_value,
                  }}
                />
                {/* 편집 버튼을 카드 위에 오버레이 - ready 또는 processing 상태일 때만 표시 */}
                {canEdit && (
                  <Button
                    onClick={() => handleEdit(fund)}
                    variant="outline"
                    size="sm"
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm hover:bg-white"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          }

          // 편집 중일 때는 기존의 간단한 편집 카드 사용
          return (
            <Card
              key={fund.membership.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <Building className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {fund.name || '펀드명 불명'}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-500">
                        출자 정보 수정 중
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button onClick={handleSave} size="sm">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* 출자 금액 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">
                        출자금액
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(editUnits, fund.par_value)}
                    </span>
                  </div>

                  {/* 출자 약정좌수 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      출자 약정좌수
                    </span>
                    <Input
                      type="number"
                      value={editUnits}
                      onChange={e => setEditUnits(Number(e.target.value))}
                      className="w-24 h-8 text-sm text-right"
                      min="1"
                    />
                  </div>

                  {/* 출자 일시 */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>출자일</span>
                      </div>
                      <span>
                        {new Date(
                          fund.membership.created_at
                        ).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>

                  {/* 1좌당 금액 안내 */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">
                        1좌당 금액
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {fund.par_value.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
