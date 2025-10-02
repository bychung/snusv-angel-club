'use client';

import BirthDateInput from '@/components/survey/inputs/BirthDateInput';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemberWithFund } from '@/lib/admin/members';
import { formatBusinessNumber, formatPhoneNumber } from '@/lib/format-utils';
import { createBrandClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { EmailNotificationType } from '@/types/database';
import { ChevronDown, Mail, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EditMemberModalProps {
  isOpen: boolean;
  member: MemberWithFund | null;
  isUpdating: boolean;
  onClose: () => void;
  onUpdate: () => void;
  showInvestmentInfo?: boolean;
}

export default function EditMemberModal({
  isOpen,
  member,
  isUpdating,
  onClose,
  onUpdate,
  showInvestmentInfo = true,
}: EditMemberModalProps) {
  const { profile } = useAuthStore(); // 현재 로그인한 관리자의 프로필 정보
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birth_date: '',
    business_number: '',
    investment_units: 0,
    total_units: 0,
    role: 'USER' as 'ADMIN' | 'USER',
    email_notifications: [] as EmailNotificationType[],
  });
  const [fundMinUnits, setFundMinUnits] = useState<number>(1); // 펀드의 최소 출자좌수
  const [paymentSchedule, setPaymentSchedule] = useState<
    'lump_sum' | 'capital_call'
  >('lump_sum'); // 펀드의 출자방식

  useEffect(() => {
    if (member) {
      const investmentUnits = member.fund_members?.[0]?.investment_units || 0;
      const totalUnits =
        member.fund_members?.[0]?.total_units || investmentUnits;

      setFormData({
        name: member.name,
        phone: member.phone,
        email: member.email,
        address: member.address,
        birth_date: member.birth_date || '',
        business_number: member.business_number || '',
        investment_units: investmentUnits,
        total_units: totalUnits,
        role: member.role,
        email_notifications: member.email_notifications || [],
      });

      // 펀드 정보 가져오기 (fund_id가 있는 경우에만)
      if (member.fund_members && member.fund_members.length > 0) {
        const fundId = member.fund_members[0].fund_id;
        loadFundInfo(fundId);
      }
    }
  }, [member]);

  const loadFundInfo = async (fundId: string) => {
    try {
      const brandClient = createBrandClient();
      const { data, error } = await brandClient.funds
        .select('min_units, payment_schedule')
        .eq('id', fundId)
        .single();

      if (error) {
        console.error('펀드 정보 로딩 오류:', error);
        return;
      }

      if (data) {
        setFundMinUnits(data.min_units || 1);
        setPaymentSchedule(data.payment_schedule || 'lump_sum');
      }
    } catch (error) {
      console.error('펀드 정보 로딩 중 오류 발생:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    // 유효성 검증
    if (
      showInvestmentInfo &&
      formData.total_units > 0 &&
      formData.total_units < fundMinUnits
    ) {
      alert(`약정출자좌수는 최소 ${fundMinUnits}좌 이상이어야 합니다.`);
      return;
    }

    if (
      showInvestmentInfo &&
      formData.total_units < formData.investment_units
    ) {
      alert('약정출자좌수는 출자좌수보다 크거나 같아야 합니다.');
      return;
    }

    try {
      const brandClient = createBrandClient();

      // 프로필 정보 업데이트 (role 포함, 브랜드별 자동 적용)
      const { error: profileError } = await brandClient.profiles
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          birth_date: formData.birth_date || null,
          business_number: formData.business_number || null,
          role: formData.role,
          email_notifications: formData.email_notifications,
          updated_at: new Date().toISOString(),
        })
        .eq('id', member.id);

      if (profileError) throw profileError;

      // 출자 정보 업데이트 (fund_members 테이블) - showInvestmentInfo가 true일 때만
      if (
        showInvestmentInfo &&
        member.fund_members &&
        member.fund_members.length > 0
      ) {
        const { error: fundMemberError } = await brandClient.fundMembers
          .update({
            investment_units: formData.investment_units,
            total_units: formData.total_units,
            updated_by: profile?.id || null, // 수정자 프로필 ID 기록
            updated_at: new Date().toISOString(),
          })
          .eq('id', member.fund_members[0].id);

        if (fundMemberError) throw fundMemberError;
      }

      // 성공 시 콜백 호출
      onUpdate();
      onClose();
    } catch (error) {
      console.error('조합원 정보 업데이트 실패:', error);
      alert('조합원 정보 업데이트에 실패했습니다.');
    }
  };

  // 이메일 알림 설정 관리 함수들
  const emailNotificationOptions = [
    { value: 'startup_inquiry', label: '스타트업 IR 문의', abbreviation: 'IR' },
    {
      value: 'angel_inquiry',
      label: '엔젤클럽 가입 문의',
      abbreviation: '클럽가입',
    },
    {
      value: 'signup_inquiry',
      label: '회원가입 문의',
      abbreviation: '회원가입',
    },
  ] as const;

  const toggleEmailNotification = (type: EmailNotificationType) => {
    const currentNotifications = formData.email_notifications;
    const isSelected = currentNotifications.includes(type);

    if (isSelected) {
      setFormData({
        ...formData,
        email_notifications: currentNotifications.filter(n => n !== type),
      });
    } else {
      setFormData({
        ...formData,
        email_notifications: [...currentNotifications, type],
      });
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조합원 정보 수정</DialogTitle>
          <DialogDescription>
            {member.name}님의 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호 *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e =>
                  setFormData({
                    ...formData,
                    phone: formatPhoneNumber(e.target.value),
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {/* 개인/법인에 따른 추가 필드 */}
            {member.entity_type === 'individual' && (
              <div className="space-y-2">
                <BirthDateInput
                  label="생년월일"
                  value={formData.birth_date}
                  onChange={value =>
                    setFormData({ ...formData, birth_date: value })
                  }
                />
              </div>
            )}

            {member.entity_type === 'corporate' && (
              <div className="space-y-2">
                <Label htmlFor="business_number">사업자번호</Label>
                <Input
                  id="business_number"
                  value={formData.business_number}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      business_number: formatBusinessNumber(e.target.value),
                    })
                  }
                  placeholder="123-45-67890"
                />
              </div>
            )}

            {/* 출자 정보는 펀드 멤버 목록에서만 표시 */}
            {showInvestmentInfo && (
              <>
                {/* 출자좌수 - 관리자가 실제 납입을 기록 */}
                <div className="space-y-2">
                  <Label htmlFor="investment_units">출자좌수 (실제 납입)</Label>
                  <Input
                    id="investment_units"
                    type="number"
                    min="0"
                    value={formData.investment_units}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        investment_units: Number(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-gray-500">
                    출자금액:{' '}
                    {(
                      formData.investment_units *
                      (member?.fund_members?.[0]?.fund?.par_value || 1000000)
                    ).toLocaleString()}
                    원
                    <br />
                    실제로 출자한 좌수를 입력하세요 (0 = 미납입)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_units">약정출자좌수 *</Label>
                  <Input
                    id="total_units"
                    type="number"
                    min={fundMinUnits}
                    value={formData.total_units}
                    onChange={e => {
                      const value = Number(e.target.value);
                      setFormData({
                        ...formData,
                        total_units: value,
                      });
                    }}
                    required={showInvestmentInfo}
                  />
                  <p className="text-xs text-gray-500">
                    약정금액:{' '}
                    {(
                      formData.total_units *
                      (member?.fund_members?.[0]?.fund?.par_value || 1000000)
                    ).toLocaleString()}
                    원
                    <br />
                    약정출자좌수는 출자좌수와 같거나 커야 하며, 최소{' '}
                    {fundMinUnits}좌 이상이어야 합니다
                  </p>
                </div>
              </>
            )}

            {/* 권한 설정 */}
            <div className="space-y-2">
              <Label htmlFor="role">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  권한
                </div>
              </Label>
              <select
                value={formData.role}
                onChange={e =>
                  setFormData({
                    ...formData,
                    role: e.target.value as 'ADMIN' | 'USER',
                  })
                }
                className="h-9 px-3 py-1 border rounded-md bg-transparent border-input w-full text-sm"
              >
                <option value="USER">일반 사용자</option>
                <option value="ADMIN">관리자</option>
              </select>
              {formData.role !== member?.role && (
                <p className="text-xs text-amber-600">
                  ⚠️ 권한이 변경됩니다. 저장 후 즉시 반영됩니다.
                </p>
              )}
            </div>

            {/* 이메일 알림 수신 설정 - 관리자만 표시 */}
            {formData.role === 'ADMIN' && (
              <div className="space-y-2">
                <Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    알림 이메일 수신
                  </div>
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {formData.email_notifications.length === 0 ? (
                          <span className="text-gray-500">
                            알림을 받을 문의 유형 선택
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-full overflow-hidden">
                            {formData.email_notifications
                              .slice(0, 3)
                              .map(notificationType => {
                                const option = emailNotificationOptions.find(
                                  o => o.value === notificationType
                                );
                                return option ? (
                                  <Badge
                                    key={notificationType}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {option.abbreviation}
                                  </Badge>
                                ) : null;
                              })}
                            {formData.email_notifications.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{formData.email_notifications.length - 3}개 더
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <DropdownMenuLabel className="flex items-center justify-between">
                      <span>문의 유형 선택</span>
                      {formData.email_notifications.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              email_notifications: [],
                            })
                          }
                        >
                          전체 해제
                        </Button>
                      )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-60 overflow-y-auto">
                      {emailNotificationOptions.map(option => (
                        <DropdownMenuItem
                          key={option.value}
                          className="flex items-center space-x-3 cursor-pointer"
                          onSelect={e => {
                            e.preventDefault(); // 드롭다운이 닫히지 않도록
                            toggleEmailNotification(option.value);
                          }}
                        >
                          <Checkbox
                            checked={formData.email_notifications.includes(
                              option.value
                            )}
                            onChange={() => {}} // onSelect에서 처리하므로 빈 함수
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {option.label}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <p className="text-xs text-gray-500">
                  선택한 문의 유형에 대해 이메일 알림을 받습니다.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소 *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={e =>
                setFormData({ ...formData, address: e.target.value })
              }
              required
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">기본 정보</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">구분:</span>{' '}
                {member.entity_type === 'individual' ? '개인' : '법인'}
              </div>
              <div>
                <span className="font-medium">가입일:</span>{' '}
                {new Date(member.created_at).toLocaleDateString('ko-KR')}
              </div>
              <div>
                <span className="font-medium">등록 상태:</span>{' '}
                {member.registration_status === 'registered'
                  ? '가입완료'
                  : '설문만'}
              </div>
              {member.updated_at !== member.created_at && (
                <div>
                  <span className="font-medium">최종 수정일:</span>{' '}
                  {new Date(member.updated_at).toLocaleDateString('ko-KR')}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              취소
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
