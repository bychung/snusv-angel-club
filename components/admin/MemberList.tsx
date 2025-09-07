'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { FundMember, Profile } from '@/types/database';
import { Building, Edit, Eye, Filter, Mail, Phone, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import EditMemberModal from './EditMemberModal';
import ViewMemberModal from './ViewMemberModal';

interface MemberWithFund extends Profile {
  fund_members?: (FundMember & { fund?: { name: string; abbreviation?: string | null } })[];
  registration_status: 'registered' | 'survey_only';
}

interface MemberListProps {
  mode: 'users' | 'fund_members';
  fundId?: string;
  fundName?: string;
}

export default function MemberList({ mode, fundId, fundName }: MemberListProps) {
  const [members, setMembers] = useState<MemberWithFund[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'survey_only'>(
    mode === 'users' ? 'registered' : 'all'
  );

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithFund | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 상세 보기 모달 상태
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<MemberWithFund | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [mode, fundId]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, filterStatus]);

  const fetchMembers = async () => {
    try {
      const supabase = createClient();

      if (mode === 'fund_members' && fundId) {
        // 특정 펀드의 조합원 목록 조회
        const { data: fundMembers, error } = await supabase
          .from('fund_members')
          .select(
            `
            *,
            profile:profiles (*)
          `
          )
          .eq('fund_id', fundId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // 프로필과 fund_member 정보를 합쳐서 형태 변환
        const membersWithStatus: MemberWithFund[] =
          fundMembers?.map(fundMember => ({
            ...fundMember.profile,
            fund_members: [fundMember],
            registration_status: fundMember.profile?.user_id ? 'registered' : 'survey_only',
          })) || [];

        setMembers(membersWithStatus);
      } else {
        // 모든 사용자 목록 조회
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select(
            `
            *,
            fund_members (
              id,
              investment_units,
              created_at,
              updated_at,
              fund:funds (
                name,
                abbreviation
              )
            )
          `
          )
          .order('created_at', { ascending: false });

        if (error) throw error;

        const usersWithStatus: MemberWithFund[] = profiles.map(profile => ({
          ...profile,
          registration_status: profile.user_id ? 'registered' : 'survey_only',
        }));

        setMembers(usersWithStatus);
      }
    } catch (error) {
      console.error('목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = members;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        member =>
          member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          member.phone.includes(searchTerm)
      );
    }

    // 상태 필터링
    if (filterStatus !== 'all') {
      filtered = filtered.filter(member => member.registration_status === filterStatus);
    }

    setFilteredMembers(filtered);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return (amount * 1000000).toLocaleString() + '원';
  };

  const handleEditMember = (member: MemberWithFund) => {
    setEditingMember(member);
    setIsEditModalOpen(true);
  };

  const handleViewMember = (member: MemberWithFund) => {
    setViewingMember(member);
    setIsViewModalOpen(true);
  };

  const handleUpdateSuccess = async () => {
    await fetchMembers();
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
    return `총 ${filteredMembers.length}명의 ${memberType}이 있습니다.`;
  };

  const getSearchTitle = () => {
    return mode === 'fund_members' ? '조합원 검색 및 필터' : '사용자 검색 및 필터';
  };

  const getEmptyMessage = () => {
    if (members.length === 0) {
      return mode === 'fund_members' ? '등록된 조합원이 없습니다.' : '등록된 사용자가 없습니다.';
    }
    return mode === 'fund_members'
      ? '조건에 맞는 조합원이 없습니다.'
      : '조건에 맞는 사용자가 없습니다.';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 검색 및 필터 */}
      <Card>
        <CardHeader>
          <CardTitle>{getSearchTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름, 이메일, 전화번호로 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">전체</option>
                <option value="registered">가입완료</option>
                <option value="survey_only">설문만</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{getEmptyMessage()}</div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewMember(member)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            member.entity_type === 'corporate' ? 'bg-blue-100' : 'bg-green-100'
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
                          {mode === 'fund_members' ? (
                            // 펀드 조합원 모드: 출자금액 표시
                            member.fund_members && member.fund_members.length > 0 && (
                              <div className="text-sm font-medium text-blue-400">
                                {formatCurrency(member.fund_members[0].investment_units)}
                              </div>
                            )
                          ) : (
                            // 사용자 관리 모드: 펀드 칩 표시
                            member.fund_members && member.fund_members.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {member.fund_members.map((fundMember, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    {fundMember.fund?.abbreviation || fundMember.fund?.name || '펀드'}
                                  </Badge>
                                ))}
                              </div>
                            )
                          )}
                          {mode === 'fund_members' && getStatusBadge(member.registration_status)}
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center space-x-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.phone}</span>
                        </div>
                        {mode === 'fund_members' && member.fund_members && member.fund_members.length > 0 && (
                          <div className="text-xs text-gray-500">
                            <span>
                              {member.fund_members[0].investment_units.toLocaleString()}좌
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMember(member);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        상세
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMember(member);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                    </div>
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
                    {mode === 'fund_members' && member.fund_members && member.fund_members.length > 0 && (
                      <div className="flex gap-4 text-xs">
                        <span>
                          <span className="font-medium">출자좌수:</span>{' '}
                          {member.fund_members[0].investment_units.toLocaleString()}좌
                        </span>
                        <span>
                          <span className="font-medium">출자금액:</span>{' '}
                          {formatCurrency(member.fund_members[0].investment_units)}
                        </span>
                      </div>
                    )}
                    {mode === 'users' && member.fund_members && member.fund_members.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {member.fund_members.map((fundMember, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                            {fundMember.fund?.abbreviation || fundMember.fund?.name || '펀드'}
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

      {/* 상세 보기 모달 */}
      <ViewMemberModal
        isOpen={isViewModalOpen}
        member={viewingMember}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingMember(null);
        }}
        showInvestmentInfo={mode === 'fund_members'}
      />

      {/* 수정 모달 */}
      <EditMemberModal
        isOpen={isEditModalOpen}
        member={editingMember}
        isUpdating={isUpdating}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingMember(null);
        }}
        onUpdate={handleUpdateSuccess}
        showInvestmentInfo={mode === 'fund_members'}
      />
    </div>
  );
}
