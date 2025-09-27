import MemberModals from '@/components/admin/MemberModals';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MemberWithFund } from '@/lib/admin/members';
import { Building, Mail, Phone, Shield, User } from 'lucide-react';

interface MemberTableProps {
  members: MemberWithFund[];
  mode: 'users' | 'fund_members';
  fundId?: string;
  fundName?: string;
}

export default function MemberTable({
  members,
  mode,
  fundId,
  fundName,
}: MemberTableProps) {
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

  const getRoleBadge = (role: 'ADMIN' | 'USER') => {
    if (role === 'ADMIN') {
      return (
        <Badge
          variant="destructive"
          className="bg-red-100 text-red-800 text-xs"
        >
          <Shield className="h-3 w-3 mr-1" />
          관리자
        </Badge>
      );
    }
    return null;
  };

  const formatCurrency = (amount: number, parValue: number = 1000000) => {
    return (amount * parValue).toLocaleString() + '원';
  };

  // 제목과 설명 텍스트 결정
  const getTitle = () => {
    if (mode === 'fund_members') {
      return `${fundName || '펀드'} 조합원 목록`;
    }
    return '사용자 목록';
  };

  const getDescription = () => {
    const memberType = mode === 'fund_members' ? '조합원' : '사용자';
    return `총 ${members.length}명의 ${memberType}이 있습니다.`;
  };

  const getEmptyMessage = () => {
    if (members.length === 0) {
      return mode === 'fund_members'
        ? '등록된 조합원이 없습니다.'
        : '등록된 사용자가 없습니다.';
    }
    return mode === 'fund_members'
      ? '조건에 맞는 조합원이 없습니다.'
      : '조건에 맞는 사용자가 없습니다.';
  };

  return (
    <div className="space-y-6">
      {/* 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {getEmptyMessage()}
            </div>
          ) : (
            <div className="space-y-4">
              {members.map(member => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            member.entity_type === 'corporate'
                              ? 'bg-blue-100'
                              : 'bg-green-100'
                          }`}
                        >
                          {member.entity_type === 'corporate' ? (
                            <Building className="h-4 w-4 text-blue-600" />
                          ) : (
                            <User className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {member.name}
                          </h3>
                          {getRoleBadge(member.role)}
                          {mode === 'fund_members'
                            ? // 펀드 조합원 모드: 출자금액 표시
                              member.fund_members &&
                              member.fund_members.length > 0 && (
                                <div>
                                  <div className="text-sm font-medium text-blue-500">
                                    {formatCurrency(
                                      member.fund_members[0].investment_units,
                                      member.fund_members[0].fund?.par_value ||
                                        1000000
                                    )}
                                  </div>
                                  <div className="text-sm font-medium text-blue-300">
                                    {member.fund_members[0].total_units !==
                                      member.fund_members[0]
                                        .investment_units && (
                                      <span>
                                        {'(약정: '}
                                        {formatCurrency(
                                          member.fund_members[0].total_units,
                                          member.fund_members[0].fund
                                            ?.par_value || 1000000
                                        )}
                                        {')'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            : // 사용자 관리 모드: 펀드 칩 표시
                              member.fund_members &&
                              member.fund_members.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {member.fund_members.map(
                                    (fundMember, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="text-xs bg-blue-100 text-blue-800"
                                      >
                                        {fundMember.fund?.abbreviation ||
                                          fundMember.fund?.name ||
                                          '펀드'}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              )}
                          {mode === 'fund_members' &&
                            getStatusBadge(member.registration_status)}
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">
                            {member.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                        {mode === 'fund_members' &&
                          member.fund_members &&
                          member.fund_members.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <span>
                                {member.fund_members[0].investment_units.toLocaleString()}
                                좌
                              </span>
                              {member.fund_members[0].total_units !==
                                member.fund_members[0].investment_units && (
                                <span>
                                  {' '}
                                  /{' '}
                                  {member.fund_members[0].total_units.toLocaleString()}
                                  좌
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <MemberModals member={member} mode={mode} />
                  </div>

                  {/* 모바일에서 추가 정보 표시 */}
                  <div className="sm:hidden mt-2 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{member.phone}</span>
                    </div>
                    {mode === 'fund_members' &&
                      member.fund_members &&
                      member.fund_members.length > 0 && (
                        <div className="flex gap-4 text-xs">
                          <span>
                            <span className="font-medium">출자좌수:</span>{' '}
                            {member.fund_members[0].investment_units.toLocaleString()}
                            좌
                          </span>
                          <span>
                            <span className="font-medium">출자금액:</span>{' '}
                            {formatCurrency(
                              member.fund_members[0].investment_units,
                              member.fund_members[0].fund?.par_value || 1000000
                            )}
                          </span>
                        </div>
                      )}
                    {mode === 'users' &&
                      member.fund_members &&
                      member.fund_members.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {member.fund_members.map((fundMember, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs bg-blue-100 text-blue-800"
                            >
                              {fundMember.fund?.abbreviation ||
                                fundMember.fund?.name ||
                                '펀드'}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
