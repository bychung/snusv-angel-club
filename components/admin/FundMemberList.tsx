'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { FundMember, Profile } from '@/types/database';
import { Building, Edit, Eye, Filter, Mail, Phone, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MemberWithFund extends Profile {
  fund_members?: FundMember[];
  registration_status: 'registered' | 'survey_only';
}

interface FundMemberListProps {
  fundId: string;
  fundName: string;
}

export default function FundMemberList({ fundId, fundName }: FundMemberListProps) {
  const [members, setMembers] = useState<MemberWithFund[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberWithFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'survey_only'>('all');

  useEffect(() => {
    fetchMembers();
  }, [fundId]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, filterStatus]);

  const fetchMembers = async () => {
    try {
      const supabase = createClient();

      // 특정 펀드의 조합원 목록 조회
      const { data: fundMembers, error } = await supabase
        .from('fund_members')
        .select(`
          *,
          profile:profiles (*)
        `)
        .eq('fund_id', fundId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 프로필과 fund_member 정보를 합쳐서 형태 변환
      const membersWithStatus: MemberWithFund[] = fundMembers?.map(fundMember => ({
        ...fundMember.profile,
        fund_members: [fundMember],
        registration_status: fundMember.profile?.user_id ? 'registered' : 'survey_only',
      })) || [];

      setMembers(membersWithStatus);
    } catch (error) {
      console.error('조합원 목록 조회 실패:', error);
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
          <CardTitle>조합원 검색 및 필터</CardTitle>
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

      {/* 조합원 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>{fundName} 조합원 목록</CardTitle>
          <CardDescription>총 {filteredMembers.length}명의 조합원이 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {members.length === 0
                ? '등록된 조합원이 없습니다.'
                : '조건에 맞는 조합원이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map(member => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {member.entity_type === 'corporate' ? (
                            <Building className="h-6 w-6 text-gray-600" />
                          ) : (
                            <User className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                          {getStatusBadge(member.registration_status)}
                          <Badge variant="outline">
                            {member.entity_type === 'individual' ? '개인' : '법인'}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {member.phone}
                          </div>
                          <div className="text-xs text-gray-500">
                            가입일: {formatDate(member.created_at)}
                            {member.created_at !== member.updated_at && (
                              <span> • 수정일: {formatDate(member.updated_at)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        상세
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                    </div>
                  </div>

                  {/* 투자 정보 */}
                  {member.fund_members && member.fund_members.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">출자좌수:</span>
                          <span className="ml-2 text-gray-900">
                            {member.fund_members[0].investment_units.toLocaleString()}좌
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">출자금액:</span>
                          <span className="ml-2 text-gray-900">
                            {formatCurrency(member.fund_members[0].investment_units)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">제출일:</span>
                          <span className="ml-2 text-gray-900">
                            {formatDate(member.fund_members[0].created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}