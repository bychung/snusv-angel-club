'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import {
  formatBusinessNumber,
  formatCorporateRegistrationNumber,
  formatDate,
  validateDate,
} from '@/lib/format-utils';
import type { Company, CompanyInput } from '@/types/companies';
import { INDUSTRY_CATEGORIES } from '@/types/companies';
import { useEffect, useState } from 'react';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: Company) => void;
  company?: Company | null;
}

export function CompanyModal({
  isOpen,
  onClose,
  onSave,
  company,
}: CompanyModalProps) {
  const [formData, setFormData] = useState<CompanyInput>({
    name: '',
    description: '',
    website: '',
    business_number: '',
    registration_number: '',
    category: [],
    established_at: '',
    brand: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!company;

  // 모달이 열릴 때 폼 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (company) {
        // 편집 모드: 기존 데이터로 초기화
        setFormData({
          name: company.name,
          description: company.description || '',
          website: company.website || '',
          business_number: company.business_number || '',
          registration_number: company.registration_number || '',
          category: company.category,
          established_at: company.established_at || '',
          brand: company.brand,
        });
      } else {
        // 생성 모드: 빈 폼으로 초기화
        setFormData({
          name: '',
          description: '',
          website: '',
          business_number: '',
          registration_number: '',
          category: [],
          established_at: '',
          brand: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, company]);

  const handleInputChange = (field: keyof CompanyInput, value: string) => {
    let formattedValue = value;

    // 사업자번호, 법인등록번호, 날짜에 자동 포맷팅 적용
    if (field === 'business_number') {
      formattedValue = formatBusinessNumber(value);
    } else if (field === 'registration_number') {
      formattedValue = formatCorporateRegistrationNumber(value);
    } else if (field === 'established_at') {
      formattedValue = formatDate(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    // 에러 클리어
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(category)
        ? prev.category.filter(c => c !== category)
        : [...prev.category, category],
    }));
    // 카테고리 에러 클리어
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '회사명은 필수입니다';
    }

    if (formData.category.length === 0) {
      newErrors.category = '최소 하나의 카테고리를 선택해주세요';
    }

    if (formData.website && formData.website.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(formData.website)) {
        newErrors.website =
          '올바른 URL 형식이 아닙니다 (http:// 또는 https:// 포함)';
      }
    }

    if (formData.business_number && formData.business_number.trim()) {
      const businessNumberPattern = /^\d{3}-?\d{2}-?\d{5}$/;
      if (
        !businessNumberPattern.test(formData.business_number.replace(/-/g, ''))
      ) {
        newErrors.business_number =
          '올바른 사업자등록번호 형식이 아닙니다 (10자리 숫자)';
      }
    }

    if (formData.established_at && !validateDate(formData.established_at)) {
      newErrors.established_at =
        '올바른 날짜가 아닙니다 (예: 20240820 → 2024-08-20)';
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
        ? `/api/admin/companies/${company.id}`
        : '/api/admin/companies';

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
        onSave(result.company);
        onClose();
      } else {
        // 서버 에러 메시지 표시
        if (result.error) {
          setErrors({ submit: result.error });
        }
      }
    } catch (error) {
      console.error('회사 저장 실패:', error);
      setErrors({ submit: '회사 저장에 실패했습니다. 다시 시도해주세요.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '회사 정보 수정' : '새 회사 등록'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? '회사 정보를 수정합니다. 변경 후 저장 버튼을 클릭하세요.'
              : '새로운 포트폴리오 회사를 등록합니다. 모든 필수 정보를 입력하세요.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">기본 정보</h3>

            <div className="space-y-2">
              <Label htmlFor="name">회사명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="회사명을 입력하세요"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">회사 설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="회사에 대한 간단한 설명을 입력하세요"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">웹사이트</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={e => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website}</p>
              )}
            </div>
          </div>

          {/* 등록 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">등록 정보</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자등록번호</Label>
                <Input
                  id="business_number"
                  value={formData.business_number}
                  onChange={e =>
                    handleInputChange('business_number', e.target.value)
                  }
                  placeholder="123-45-67890"
                  className={errors.business_number ? 'border-red-500' : ''}
                />
                {errors.business_number && (
                  <p className="text-sm text-red-600">
                    {errors.business_number}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number">법인등록번호</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={e =>
                    handleInputChange('registration_number', e.target.value)
                  }
                  placeholder="123456-1234567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="established_at">설립일</Label>
              <div className="relative">
                <Input
                  id="established_at"
                  type="text"
                  value={formData.established_at}
                  onChange={e =>
                    handleInputChange('established_at', e.target.value)
                  }
                  placeholder="2024-08-20 (YYYY-MM-DD)"
                  className={errors.established_at ? 'border-red-500' : ''}
                />
              </div>
              {errors.established_at && (
                <p className="text-sm text-red-600">{errors.established_at}</p>
              )}
            </div>
          </div>

          {/* 산업 분야 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>산업 분야 * (복수 선택 가능)</Label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {INDUSTRY_CATEGORIES.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={formData.category.includes(category)}
                      onCheckedChange={() => handleCategoryToggle(category)}
                    />
                    <Label
                      htmlFor={`category-${category}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.category.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.category.map(cat => (
                    <Badge key={cat} variant="secondary" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              )}
              {errors.category && (
                <p className="text-sm text-red-600">{errors.category}</p>
              )}
            </div>
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
      </DialogContent>
    </Dialog>
  );
}
