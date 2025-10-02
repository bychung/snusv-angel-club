'use client';

import BirthDateInput from '@/components/survey/inputs/BirthDateInput';
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
import { formatBusinessNumber, formatPhoneNumber } from '@/lib/format-utils';
import { createBrandClient } from '@/lib/supabase/client';
import { Building, User, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AddMemberModalProps {
  isOpen: boolean;
  fundId: string;
  fundName: string;
  isAdding: boolean;
  onClose: () => void;
  onAdd: () => void;
}

interface MemberFormData {
  name: string;
  phone: string;
  email: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string;
  business_number?: string;
  address: string;
  investment_units: number;
  total_units: number;
}

interface ExistingProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  entity_type: 'individual' | 'corporate';
  birth_date?: string;
  business_number?: string;
  address: string;
}

export default function AddMemberModal({
  isOpen,
  fundId,
  fundName,
  isAdding,
  onClose,
  onAdd,
}: AddMemberModalProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    phone: '',
    email: '',
    entity_type: 'individual',
    birth_date: '',
    business_number: '',
    address: '',
    investment_units: 1,
    total_units: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingProfiles, setExistingProfiles] = useState<ExistingProfile[]>(
    []
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null
  );
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [fundMinUnits, setFundMinUnits] = useState<number>(1); // 펀드의 최소 출자좌수

  // 기존 프로필 불러오기 및 펀드 정보 불러오기
  useEffect(() => {
    if (isOpen) {
      loadExistingProfiles();
      loadFundInfo();
    }
  }, [isOpen, fundId]);

  const loadFundInfo = async () => {
    try {
      const brandClient = createBrandClient();
      const { data, error } = await brandClient.funds
        .select('min_units')
        .eq('id', fundId)
        .single();

      if (error) {
        console.error('펀드 정보 로딩 오류:', error);
        return;
      }

      if (data) {
        setFundMinUnits(data.min_units || 1);
      }
    } catch (error) {
      console.error('펀드 정보 로딩 중 오류 발생:', error);
    }
  };

  const loadExistingProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const brandClient = createBrandClient();
      const { data, error } = await brandClient.profiles
        .select(
          'id, name, email, phone, entity_type, birth_date, business_number, address'
        )
        .order('name');

      if (error) {
        console.error('프로필 로딩 오류:', error);
        return;
      }

      setExistingProfiles(data || []);
    } catch (error) {
      console.error('프로필 로딩 중 오류 발생:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // 기존 조합원 선택 핸들러
  const handleExistingMemberSelect = (profileId: string) => {
    const actualProfileId = profileId === 'none' ? null : profileId;
    setSelectedProfileId(actualProfileId);

    if (actualProfileId) {
      // 기존 조합원 선택 시 해당 프로필 정보로 폼 채우기
      const selectedProfile = existingProfiles.find(
        p => p.id === actualProfileId
      );
      if (selectedProfile) {
        setFormData({
          name: selectedProfile.name,
          phone: selectedProfile.phone,
          email: selectedProfile.email,
          entity_type: selectedProfile.entity_type,
          birth_date: selectedProfile.birth_date || '',
          business_number: selectedProfile.business_number || '',
          address: selectedProfile.address,
          investment_units: formData.investment_units,
          total_units: formData.total_units,
        });
      }
    } else {
      // 기본값 선택 시 폼 초기화
      setFormData({
        name: '',
        phone: '',
        email: '',
        entity_type: 'individual',
        birth_date: '',
        business_number: '',
        address: '',
        investment_units: 1,
        total_units: 1,
      });
    }
    setError(null);
  };

  const handleChange = (
    field: keyof MemberFormData,
    value: string | number
  ) => {
    let formattedValue = value;

    // 사업자번호와 전화번호에 자동 포맷팅 적용
    if (typeof value === 'string') {
      if (field === 'business_number') {
        formattedValue = formatBusinessNumber(value);
      } else if (field === 'phone') {
        formattedValue = formatPhoneNumber(value);
      }
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setError(null);
  };

  const handleEntityTypeChange = (type: 'individual' | 'corporate') => {
    setFormData(prev => ({
      ...prev,
      entity_type: type,
      birth_date: type === 'individual' ? prev.birth_date : undefined,
      business_number: type === 'corporate' ? prev.business_number : undefined,
    }));
  };

  const validateForm = () => {
    const {
      name,
      phone,
      email,
      address,
      investment_units,
      total_units,
      entity_type,
      birth_date,
      business_number,
    } = formData;

    if (!name.trim()) return '이름/회사명을 입력해주세요.';
    if (!phone.trim()) return '전화번호를 입력해주세요.';
    if (!email.trim()) return '이메일을 입력해주세요.';
    if (!address.trim()) return '주소를 입력해주세요.';
    if (investment_units <= 0) return '출자좌수는 1좌 이상이어야 합니다.';
    if (total_units < fundMinUnits)
      return `약정출자좌수는 최소 ${fundMinUnits}좌 이상이어야 합니다.`;
    if (total_units < investment_units)
      return '약정출자좌수는 출자좌수보다 크거나 같아야 합니다.';

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return '유효한 이메일 주소를 입력해주세요.';

    // 개인인 경우 생년월일 검증 (선택사항이므로 입력했을 경우만)
    if (entity_type === 'individual' && birth_date && birth_date.trim()) {
      const birthDateObj = new Date(birth_date);
      if (isNaN(birthDateObj.getTime()))
        return '유효한 생년월일을 입력해주세요.';
    }

    // 법인인 경우 사업자번호 검증 (선택사항이므로 입력했을 경우만)
    if (
      entity_type === 'corporate' &&
      business_number &&
      business_number.trim()
    ) {
      const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
      if (!businessNumberRegex.test(business_number))
        return '사업자번호 형식이 올바르지 않습니다. (예: 123-45-67890)';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const brandClient = createBrandClient();
      const {
        name,
        phone,
        email,
        entity_type,
        birth_date,
        business_number,
        address,
        investment_units,
        total_units,
      } = formData;

      let profileId: string;

      if (selectedProfileId) {
        // 기존 조합원 선택한 경우 - fund_members에만 추가
        profileId = selectedProfileId;
      } else {
        // 직접 입력한 경우 - 기존 로직 사용 (profiles + fund_members 모두)
        // 1. 이메일로 기존 프로필 검색
        const { data: existingProfile, error: searchError } =
          await brandClient.profiles
            .select('id')
            .eq('email', email.trim())
            .maybeSingle();

        if (searchError) {
          throw new Error('기존 프로필 조회 중 오류가 발생했습니다.');
        }

        if (existingProfile) {
          // 기존 프로필 존재: 해당 profile_id 사용
          profileId = existingProfile.id;
        } else {
          // 새 프로필 생성
          const profileInsertData: any = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            entity_type,
            address: address.trim(),
            user_id: null, // 어드민이 추가하는 조합원은 아직 회원가입 안함
          };

          // 개인인 경우 생년월일 추가 (값이 있을 경우만)
          if (entity_type === 'individual' && birth_date && birth_date.trim()) {
            profileInsertData.birth_date = birth_date;
          }

          // 법인인 경우 사업자번호 추가 (값이 있을 경우만)
          if (
            entity_type === 'corporate' &&
            business_number &&
            business_number.trim()
          ) {
            profileInsertData.business_number = business_number.trim();
          }

          const { data: newProfile, error: insertError } =
            await brandClient.profiles
              .insert([profileInsertData])
              .select('id')
              .single();

          if (insertError) {
            console.error('프로필 생성 오류:', insertError);
            if (insertError.code === '23505') {
              // unique constraint violation
              if (insertError.message.includes('email')) {
                throw new Error('이미 등록된 이메일입니다.');
              }
            }
            throw new Error('프로필 생성 중 오류가 발생했습니다.');
          }

          profileId = newProfile.id;
        }
      }

      // 2. fund_members에 추가
      const { error: fundMemberError } = await brandClient.fundMembers.insert([
        {
          fund_id: fundId,
          profile_id: profileId,
          investment_units,
          total_units,
        },
      ]);

      if (fundMemberError) {
        console.error('펀드 멤버 추가 오류:', fundMemberError);
        if (fundMemberError.code === '23505') {
          // unique constraint violation (fund_id, profile_id)
          throw new Error('이미 이 펀드에 등록된 조합원입니다.');
        }
        throw new Error('조합원 등록 중 오류가 발생했습니다.');
      }

      // 성공: 폼 리셋 및 콜백 호출
      setFormData({
        name: '',
        phone: '',
        email: '',
        entity_type: 'individual',
        birth_date: '',
        business_number: '',
        address: '',
        investment_units: 1,
        total_units: 1,
      });
      setSelectedProfileId(null);
      onAdd();
      onClose();
    } catch (error: any) {
      console.error('조합원 추가 실패:', error);
      setError(error.message || '조합원 추가 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      entity_type: 'individual',
      birth_date: '',
      business_number: '',
      address: '',
      investment_units: 1,
      total_units: 1,
    });
    setSelectedProfileId(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {fundName} 조합원 추가
          </DialogTitle>
          <DialogDescription>
            새로운 조합원을 등록합니다. 모든 필드를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 기존 조합원 선택 드롭다운 */}
          <div className="space-y-2">
            <Label>기존 조합원 선택</Label>
            <Select
              value={selectedProfileId || 'none'}
              onValueChange={handleExistingMemberSelect}
              disabled={isSubmitting || isLoadingProfiles}
            >
              <SelectTrigger>
                <SelectValue placeholder="---기존 조합원을 선택하세요---" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  --- 기존 조합원을 선택하세요 (현재는 직접입력 상태) ---
                </SelectItem>
                {existingProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name} ({profile.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              기존 조합원을 선택하면 출자좌수만 입력하면 됩니다. 새로운 조합원을
              추가하려면 위의 기본값을 유지하세요.
            </p>
          </div>

          {/* 개인/법인 구분 */}
          <div className="space-y-3">
            <Label>구분 *</Label>
            <div className="flex gap-4">
              <label
                className={`flex items-center space-x-2 ${
                  Boolean(selectedProfileId)
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="entity_type"
                  value="individual"
                  checked={formData.entity_type === 'individual'}
                  onChange={() => handleEntityTypeChange('individual')}
                  className="w-4 h-4 text-blue-600"
                  disabled={isSubmitting || Boolean(selectedProfileId)}
                />
                <User className="h-4 w-4 text-green-600" />
                <span>개인</span>
              </label>
              <label
                className={`flex items-center space-x-2 ${
                  Boolean(selectedProfileId)
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="entity_type"
                  value="corporate"
                  checked={formData.entity_type === 'corporate'}
                  onChange={() => handleEntityTypeChange('corporate')}
                  className="w-4 h-4 text-blue-600"
                  disabled={isSubmitting || Boolean(selectedProfileId)}
                />
                <Building className="h-4 w-4 text-blue-600" />
                <span>법인</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 이름/회사명 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                {formData.entity_type === 'individual' ? `이름 *` : `회사명 *`}
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="이름 또는 회사명"
                disabled={isSubmitting || Boolean(selectedProfileId)}
              />
            </div>

            {/* 생년월일 (개인인 경우) 또는 사업자번호 (법인인 경우) */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> */}
            {formData.entity_type === 'individual' && (
              <div className="space-y-2">
                <BirthDateInput
                  label="생년월일"
                  value={formData.birth_date || ''}
                  onChange={value => handleChange('birth_date', value)}
                  disabled={isSubmitting || Boolean(selectedProfileId)}
                />
              </div>
            )}

            {formData.entity_type === 'corporate' && (
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input
                  id="business_number"
                  value={formData.business_number || ''}
                  onChange={e =>
                    handleChange('business_number', e.target.value)
                  }
                  placeholder="123-45-67890"
                  disabled={isSubmitting || Boolean(selectedProfileId)}
                />
              </div>
            )}
            {/* </div> */}

            {/* 전화번호 */}
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="010-0000-0000"
                disabled={isSubmitting || Boolean(selectedProfileId)}
              />
            </div>

            {/* 이메일 */}
            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="example@email.com"
                disabled={isSubmitting || Boolean(selectedProfileId)}
              />
            </div>

            {/* 출자좌수 */}
            <div className="space-y-2">
              <Label htmlFor="investment_units">출자좌수 *</Label>
              <Input
                id="investment_units"
                type="number"
                min="1"
                value={formData.investment_units}
                onChange={e =>
                  handleChange(
                    'investment_units',
                    parseInt(e.target.value) || 0
                  )
                }
                placeholder="1"
                disabled={isSubmitting}
              />
            </div>

            {/* 약정출자좌수 */}
            <div className="space-y-2">
              <Label htmlFor="total_units">약정출자좌수 *</Label>
              <Input
                id="total_units"
                type="number"
                min={fundMinUnits}
                value={formData.total_units}
                onChange={e =>
                  handleChange('total_units', parseInt(e.target.value) || 0)
                }
                placeholder={fundMinUnits.toString()}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                약정출자좌수는 출자좌수와 같거나 커야 하며, 최소 {fundMinUnits}
                좌 이상이어야 합니다
              </p>
            </div>
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e => handleChange('address', e.target.value)}
              placeholder="서울특별시 강남구..."
              disabled={isSubmitting || Boolean(selectedProfileId)}
            />
          </div>

          {/* 안내 메시지 */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>참고:</strong>{' '}
              {selectedProfileId
                ? '기존 조합원을 선택했습니다. 출자좌수만 입력하면 해당 펀드의 멤버로만 추가됩니다.'
                : '새로운 조합원 정보를 직접 입력하면 프로필과 펀드 멤버 모두 생성됩니다. 이메일이 같은 기존 프로필이 있으면 해당 정보를 사용합니다.'}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '추가 중...' : '조합원 추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
