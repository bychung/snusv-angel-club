'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FundWithStats } from '@/lib/admin/funds';
import { canShowSurveyLink } from '@/lib/fund-status';
import { createBrandClient } from '@/lib/supabase/client';
import { Check, Link2, Plus } from 'lucide-react';
import { useState } from 'react';

interface FundActionsProps {
  fund: FundWithStats;
}

export default function FundActions({ fund }: FundActionsProps) {
  const [copiedFundId, setCopiedFundId] = useState<string | null>(null);

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

  // 통일된 함수를 사용하여 설문 링크 표시 여부 결정
  if (!canShowSurveyLink(fund.status)) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full min-h-10"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        copySurveyLink(fund.id, e);
      }}
    >
      {copiedFundId === fund.id ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          복사됨
        </>
      ) : (
        <>
          <Link2 className="h-4 w-4 mr-2" />
          출자 의향 설문 링크 복사
        </>
      )}
    </Button>
  );
}

// 펀드 생성 컴포넌트 (별도 export)
export function CreateFundDialog() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [newFundAbbreviation, setNewFundAbbreviation] = useState('');
  const [newFundParValue, setNewFundParValue] = useState<number>(1000000);
  const [newFundMinUnits, setNewFundMinUnits] = useState<number>(1);
  const [paymentSchedule, setPaymentSchedule] = useState<
    'lump_sum' | 'capital_call'
  >('lump_sum');
  const [isCreating, setIsCreating] = useState(false);

  // 숫자를 한국어 형식으로 포맷팅
  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  // 입력값에서 숫자만 추출
  const parseNumber = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    return cleanValue ? parseInt(cleanValue) : 0;
  };

  // 1좌당 금액 변경 핸들러
  const handleParValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    setNewFundParValue(numericValue);
  };

  const handleCreateFund = async () => {
    if (!newFundName.trim()) return;

    // 1좌당 금액 검증
    if (newFundParValue < 1000000) {
      alert('1좌당 금액은 최소 1,000,000원 이상이어야 합니다.');
      return;
    }

    // 최소 출자좌수 검증
    if (newFundMinUnits < 1) {
      alert('최소 출자좌수는 1좌 이상이어야 합니다.');
      return;
    }

    setIsCreating(true);
    try {
      // brandClient를 사용해서 브랜드 자동 처리
      const brandClient = createBrandClient();

      const { data, error } = await brandClient.funds
        .insert([
          {
            name: newFundName.trim(),
            abbreviation: newFundAbbreviation.trim() || null,
            par_value: newFundParValue,
            min_units: newFundMinUnits,
            payment_schedule: paymentSchedule,
          },
        ])
        .select();

      if (error) throw error;

      // 페이지 새로고침으로 새 펀드 반영
      window.location.reload();

      // 다이얼로그 닫기 및 폼 리셋
      setIsAddDialogOpen(false);
      setNewFundName('');
      setNewFundAbbreviation('');
      setNewFundParValue(1000000);
      setNewFundMinUnits(1);
      setPaymentSchedule('lump_sum');
    } catch (error) {
      console.error('펀드 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          펀드 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
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
              onChange={e => setNewFundName(e.target.value)}
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
              onChange={e => setNewFundAbbreviation(e.target.value)}
              className="col-span-3"
              placeholder="펀드 약칭을 입력하세요 (예: 블라인드2호)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fundParValue" className="text-right">
              1좌당 금액 *
            </Label>
            <div className="col-span-3">
              <Input
                id="fundParValue"
                value={formatNumber(newFundParValue)}
                onChange={handleParValueChange}
                className={newFundParValue < 1000000 ? 'border-red-500' : ''}
                placeholder="1,000,000"
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleCreateFund();
                  }
                }}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">최소 1,000,000원</p>
                {newFundParValue < 1000000 && (
                  <p className="text-xs text-red-500">
                    최소 1,000,000원 이상 입력해주세요
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="fundMinUnits" className="text-right">
              최소 출자좌수 *
            </Label>
            <div className="col-span-3">
              <Input
                id="fundMinUnits"
                type="number"
                value={newFundMinUnits}
                onChange={e => {
                  const value = parseInt(e.target.value) || 1;
                  setNewFundMinUnits(value);
                }}
                className={newFundMinUnits < 1 ? 'border-red-500' : ''}
                placeholder="1"
                min={1}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleCreateFund();
                  }
                }}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  출자 설문 시 최소 {newFundMinUnits}좌 이상 입력하도록
                  제한됩니다
                </p>
                {newFundMinUnits < 1 && (
                  <p className="text-xs text-red-500">
                    최소 1좌 이상 입력해주세요
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentSchedule" className="text-right">
              출자방식 *
            </Label>
            <div className="col-span-3">
              <Select
                value={paymentSchedule}
                onValueChange={(value: 'lump_sum' | 'capital_call') =>
                  setPaymentSchedule(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="출자방식 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lump_sum">일시납</SelectItem>
                  <SelectItem value="capital_call">수시납</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreateFund}
            disabled={
              isCreating ||
              !newFundName.trim() ||
              newFundParValue < 1000000 ||
              newFundMinUnits < 1
            }
          >
            {isCreating ? '생성 중...' : '펀드 생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
