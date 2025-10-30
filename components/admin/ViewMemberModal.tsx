'use client';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MemberWithFund } from '@/lib/admin/members';
import {
  Banknote,
  Building,
  Calendar,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';

interface ViewMemberModalProps {
  isOpen: boolean;
  member: MemberWithFund | null;
  onClose: () => void;
  showInvestmentInfo?: boolean;
}

export default function ViewMemberModal({
  isOpen,
  member,
  onClose,
  showInvestmentInfo = true,
}: ViewMemberModalProps) {
  if (!member) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (
    amount: number | null | undefined,
    parValue: number = 1000000
  ) => {
    if (amount == null || isNaN(amount)) {
      return '0원';
    }
    return (amount * parValue).toLocaleString() + '원';
  };

  const formatNumber = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) {
      return '0';
    }
    return value.toLocaleString();
  };

  const getStatusBadge = (status: 'registered' | 'survey_only') => {
    switch (status) {
      case 'registered':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            가입완료
          </Badge>
        );
      case 'survey_only':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            설문만
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                member.entity_type === 'corporate'
                  ? 'bg-blue-100'
                  : 'bg-green-100'
              }`}
            >
              {member.entity_type === 'corporate' ? (
                <Building className="h-5 w-5 text-blue-600" />
              ) : (
                <User className="h-5 w-5 text-green-600" />
              )}
            </div>
            {member.name} 상세 정보
          </DialogTitle>
          <DialogDescription>
            {member.entity_type === 'individual' ? '개인' : '법인'} 조합원의
            상세 정보를 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{member.name}</p>
                </div>

                {member.entity_type === 'individual' && member.birth_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      생년월일
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(member.birth_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                )}
                {member.entity_type === 'corporate' &&
                  member.business_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        사업자번호
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {member.business_number}
                      </p>
                    </div>
                  )}
                {member.entity_type === 'corporate' && member.ceo && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      대표이사
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{member.ceo}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    가입일
                  </label>
                  <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDate(member.created_at)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    구분
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-sm">
                      {member.entity_type === 'individual' ? '개인' : '법인'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    등록 상태
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(member.registration_status)}
                  </div>
                </div>

                {member.updated_at !== member.created_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      최종 수정일
                    </label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(member.updated_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* 메모 섹션 */}
              {member.memo && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">
                    메모
                  </label>
                  <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-100 p-3 rounded-md">
                    {member.memo}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 연락처 정보 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Phone className="h-5 w-5" />
              연락처 정보
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  이메일
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {member.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  전화번호
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {member.phone}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">
                  주소
                </label>
                <p className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {member.address}
                </p>
              </div>
            </div>
          </div>

          {/* 출자 정보 - 펀드 조합원 모드에서만 표시 */}
          {showInvestmentInfo &&
            member.fund_members &&
            member.fund_members.length > 0 &&
            (() => {
              const fundMember = member.fund_members[0];
              const paymentSchedule = fundMember.fund?.payment_schedule;
              const isLumpSum = paymentSchedule === 'lump_sum';

              return (
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    출자 정보
                  </h3>
                  {isLumpSum ? (
                    // 일시납: 약정출자좌수만 표시
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          출자좌수
                        </label>
                        <p className="mt-1 text-lg font-semibold text-blue-600">
                          {formatNumber(fundMember.total_units)}좌
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          출자금액
                        </label>
                        <p className="mt-1 text-lg font-semibold text-blue-600">
                          {formatCurrency(
                            fundMember.total_units,
                            fundMember.fund?.par_value
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // 수시납: 출자좌수와 약정출자좌수 모두 표시
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          출자좌수
                        </label>
                        <p className="mt-1 text-lg font-semibold text-blue-600">
                          {formatNumber(fundMember.investment_units)}좌
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          약정출자좌수
                        </label>
                        <p className="mt-1 text-lg font-semibold text-green-600">
                          {formatNumber(fundMember.total_units)}좌
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          출자금액
                        </label>
                        <p className="mt-1 text-lg font-semibold text-blue-600">
                          {formatCurrency(
                            fundMember.investment_units,
                            fundMember.fund?.par_value
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          약정출자금액
                        </label>
                        <p className="mt-1 text-lg font-semibold text-green-600">
                          {formatCurrency(
                            fundMember.total_units,
                            fundMember.fund?.par_value
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
