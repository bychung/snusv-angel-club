'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatDate, validateDate } from '@/lib/format-utils';
import type { Company } from '@/types/companies';
import type { Fund } from '@/types/database';
import type {
  InvestmentInput,
  InvestmentWithDetails,
} from '@/types/investments';
import {
  calculateInvestmentAmount,
  calculateOwnershipPercentage,
  formatCurrency,
} from '@/types/investments';
import { useEffect, useState } from 'react';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (investment: InvestmentWithDetails) => void;
  investment?: InvestmentWithDetails | null;
}

export function InvestmentModal({
  isOpen,
  onClose,
  onSave,
  investment,
}: InvestmentModalProps) {
  const [formData, setFormData] = useState<InvestmentInput>({
    company_id: '',
    fund_id: '',
    investment_date: '',
    unit_price: undefined,
    investment_shares: undefined,
    issued_shares: undefined,
    brand: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!investment;

  // 계산된 값들
  const totalInvestmentAmount = calculateInvestmentAmount(
    formData.unit_price,
    formData.investment_shares
  );
  const ownershipPercentage = calculateOwnershipPercentage(
    formData.investment_shares,
    formData.issued_shares
  );

  // 회사 및 펀드 목록 로드
  const loadOptionsData = async () => {
    setLoading(true);
    try {
      const [companiesRes, fundsRes] = await Promise.all([
        fetch('/api/admin/companies?limit=100'),
        fetch('/api/admin/funds'),
      ]);

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.companies || []);
      }

      if (fundsRes.ok) {
        const fundsData = await fundsRes.json();
        setFunds(fundsData.funds || []);
      }
    } catch (error) {
      console.error('옵션 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      loadOptionsData();

      if (investment) {
        // 편집 모드: 기존 데이터로 초기화
        setFormData({
          company_id: investment.company_id,
          fund_id: investment.fund_id,
          investment_date: investment.investment_date || '',
          unit_price: investment.unit_price || undefined,
          investment_shares: investment.investment_shares || undefined,
          issued_shares: investment.issued_shares || undefined,
          brand: investment.brand,
        });
      } else {
        // 생성 모드: 빈 폼으로 초기화
        setFormData({
          company_id: '',
          fund_id: '',
          investment_date: '',
          unit_price: undefined,
          investment_shares: undefined,
          issued_shares: undefined,
          brand: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, investment]);

  const handleInputChange = (
    field: keyof InvestmentInput,
    value: string | number | undefined
  ) => {
    let formattedValue = value;

    // 투자일에 자동 포맷팅 적용
    if (field === 'investment_date' && typeof value === 'string') {
      formattedValue = formatDate(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    // 에러 클리어
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_id) {
      newErrors.company_id = '회사를 선택해주세요';
    }

    if (!formData.fund_id) {
      newErrors.fund_id = '펀드를 선택해주세요';
    }

    if (formData.investment_date && !validateDate(formData.investment_date)) {
      newErrors.investment_date =
        '올바른 날짜가 아닙니다 (예: 20240820 → 2024-08-20)';
    }

    if (formData.unit_price !== undefined && formData.unit_price < 0) {
      newErrors.unit_price = '투자단가는 0 이상이어야 합니다';
    }

    if (
      formData.investment_shares !== undefined &&
      formData.investment_shares < 0
    ) {
      newErrors.investment_shares = '투자 주식수는 0 이상이어야 합니다';
    }

    if (formData.issued_shares !== undefined && formData.issued_shares <= 0) {
      newErrors.issued_shares = '총발행주식수는 0보다 커야 합니다';
    }

    // 지분율 검증
    if (formData.investment_shares && formData.issued_shares) {
      if (formData.investment_shares > formData.issued_shares) {
        newErrors.investment_shares =
          '투자 주식수가 총발행주식수를 초과할 수 없습니다';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const url = isEditing
        ? `/api/admin/investments/${investment.id}`
        : '/api/admin/investments';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        onSave(result.investment);
        onClose();
      } else {
        // 서버 에러 메시지 표시
        if (result.error) {
          setErrors({ submit: result.error });
        }
      }
    } catch (error) {
      console.error('투자 저장 실패:', error);
      setErrors({ submit: '투자 저장에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const getSelectedCompany = () => {
    return companies.find(c => c.id === formData.company_id);
  };

  const getSelectedFund = () => {
    return funds.find(f => f.id === formData.fund_id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl min-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '투자 정보 수정' : '새 투자 등록'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? '투자 정보를 수정합니다. 변경 후 저장 버튼을 클릭하세요.'
              : '새로운 투자를 등록합니다. 펀드와 회사 정보를 선택하고 투자 세부 정보를 입력하세요.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <p>데이터를 불러오는 중...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 기본 선택 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">투자 기본 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_id">투자 회사 *</Label>
                  <Select
                    value={formData.company_id}
                    onValueChange={value =>
                      handleInputChange('company_id', value)
                    }
                  >
                    <SelectTrigger
                      className={errors.company_id ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="회사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex flex-col items-start text-left">
                            <span className="font-medium">{company.name}</span>
                            {company.description && (
                              <span className="text-xs text-muted-foreground">
                                {company.description.substring(0, 50)}
                                {company.description.length > 50 ? '...' : ''}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.company_id && (
                    <p className="text-sm text-red-600">{errors.company_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fund_id">투자 펀드 *</Label>
                  <Select
                    value={formData.fund_id}
                    onValueChange={value => handleInputChange('fund_id', value)}
                  >
                    <SelectTrigger
                      className={errors.fund_id ? 'border-red-500' : ''}
                    >
                      <SelectValue placeholder="펀드를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map(fund => (
                        <SelectItem key={fund.id} value={fund.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{fund.name}</span>
                            {/* {fund.abbreviation && (
                              <span className="text-xs text-muted-foreground">
                                {fund.abbreviation}
                              </span>
                            )} */}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fund_id && (
                    <p className="text-sm text-red-600">{errors.fund_id}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment_date">투자일</Label>
                <Input
                  id="investment_date"
                  type="text"
                  value={formData.investment_date}
                  onChange={e =>
                    handleInputChange('investment_date', e.target.value)
                  }
                  placeholder="2024-08-20 (YYYY-MM-DD)"
                  className={errors.investment_date ? 'border-red-500' : ''}
                />
                {errors.investment_date && (
                  <p className="text-sm text-red-600">
                    {errors.investment_date}
                  </p>
                )}
              </div>
            </div>

            {/* 투자 세부 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">투자 세부 정보</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price">투자단가 (원)</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.unit_price || ''}
                    onChange={e =>
                      handleInputChange(
                        'unit_price',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="주당 가격"
                    className={errors.unit_price ? 'border-red-500' : ''}
                  />
                  {errors.unit_price && (
                    <p className="text-sm text-red-600">{errors.unit_price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="investment_shares">투자 주식수</Label>
                  <Input
                    id="investment_shares"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.investment_shares || ''}
                    onChange={e =>
                      handleInputChange(
                        'investment_shares',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="주식 수량"
                    className={errors.investment_shares ? 'border-red-500' : ''}
                  />
                  {errors.investment_shares && (
                    <p className="text-sm text-red-600">
                      {errors.investment_shares}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issued_shares">총발행주식수</Label>
                  <Input
                    id="issued_shares"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.issued_shares || ''}
                    onChange={e =>
                      handleInputChange(
                        'issued_shares',
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    placeholder="총 발행 주식"
                    className={errors.issued_shares ? 'border-red-500' : ''}
                  />
                  {errors.issued_shares && (
                    <p className="text-sm text-red-600">
                      {errors.issued_shares}
                    </p>
                  )}
                </div>
              </div>

              {/* 계산된 값 표시 */}
              {(totalInvestmentAmount > 0 || ownershipPercentage > 0) && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">
                    계산된 값
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">총 투자금액:</span>
                      <span className="ml-2 font-medium">
                        {totalInvestmentAmount > 0
                          ? formatCurrency(totalInvestmentAmount)
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">지분율:</span>
                      <span className="ml-2 font-medium">
                        {ownershipPercentage > 0
                          ? `${ownershipPercentage.toFixed(2)}%`
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 전체 에러 메시지 */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '저장 중...' : isEditing ? '수정' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
