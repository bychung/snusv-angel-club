'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type { FundMember } from '@/types/database';
import { Edit2, Save, TrendingUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function FundSection() {
  const { profile, isLoading: authLoading } = useAuthStore();
  const [fundInfo, setFundInfo] = useState<FundMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editUnits, setEditUnits] = useState(0);

  useEffect(() => {
    if (profile) {
      fetchFundInfo();
    }
  }, [profile]);

  const fetchFundInfo = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fund_members')
        .select(
          `
          *,
          funds (
            id,
            name
          )
        `
        )
        .eq('profile_id', profile.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setFundInfo(data);
    } catch (error) {
      console.error('펀드 정보 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditUnits(fundInfo?.investment_units || 0);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditUnits(fundInfo?.investment_units || 0);
  };

  const handleSave = async () => {
    if (!profile || !fundInfo) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('fund_members')
        .update({
          investment_units: editUnits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundInfo.id);

      if (error) throw error;

      // 정보 다시 가져오기
      await fetchFundInfo();
      setIsEditing(false);
    } catch (error) {
      console.error('펀드 정보 업데이트 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            펀드 투자 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!fundInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            펀드 투자 정보
          </CardTitle>
          <CardDescription>펀드 투자 정보가 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              펀드 투자 정보
            </CardTitle>
            <CardDescription>
              설문조사에서 입력한 투자 정보를 확인하고 수정할 수 있습니다.
            </CardDescription>
          </div>

          {!isEditing ? (
            <Button onClick={handleEdit} variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              수정
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 펀드 정보 */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">펀드명</h3>
          <p className="text-blue-800">
            {(fundInfo as any).funds?.name || '프로펠-SNUSV엔젤투자조합2호'}
          </p>
        </div>

        {/* 투자 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>출자좌수</Label>
            {isEditing ? (
              <Input
                type="number"
                value={editUnits}
                onChange={e => setEditUnits(Number(e.target.value))}
                placeholder="출자좌수"
                min="1"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md text-right">
                {fundInfo.investment_units.toLocaleString()}좌
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>투자금액</Label>
            <div className="p-3 bg-gray-50 rounded-md text-right font-medium">
              {((isEditing ? editUnits : fundInfo.investment_units) * 1000000).toLocaleString()}원
            </div>
          </div>

          <div className="space-y-2">
            <Label>1좌당 금액</Label>
            <div className="p-3 bg-gray-50 rounded-md text-right">1,000,000원</div>
          </div>
        </div>

        {/* 투자 일시 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>투자 일시</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              {new Date(fundInfo.created_at).toLocaleString('ko-KR')}
            </div>
          </div>

          <div className="space-y-2">
            <Label>최종 수정일</Label>
            <div className="p-3 bg-gray-50 rounded-md">
              {new Date(fundInfo.updated_at).toLocaleString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 투자 요약 */}
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <h3 className="font-medium text-green-900 mb-3">투자 요약</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">총 투자좌수:</span>
              <span className="font-medium text-green-900">
                {(isEditing ? editUnits : fundInfo.investment_units).toLocaleString()}좌
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">총 투자금액:</span>
              <span className="font-medium text-green-900">
                {((isEditing ? editUnits : fundInfo.investment_units) * 1000000).toLocaleString()}원
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
