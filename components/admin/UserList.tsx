'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import type { FundMember, Profile } from '@/types/database';
import { Building, Edit, Eye, Filter, Mail, Phone, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserWithFund extends Profile {
  fund_members?: FundMember[];
  registration_status: 'registered' | 'survey_only';
}

export default function UserList() {
  const [users, setUsers] = useState<UserWithFund[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'survey_only'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterStatus]);

  const fetchUsers = async () => {
    try {
      const supabase = createClient();

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          fund_members (
            id,
            investment_units,
            created_at,
            updated_at
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithStatus: UserWithFund[] = profiles.map(profile => ({
        ...profile,
        registration_status: profile.user_id ? 'registered' : 'survey_only',
      }));

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone.includes(searchTerm)
      );
    }

    // 상태 필터링
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => user.registration_status === filterStatus);
    }

    setFilteredUsers(filtered);
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
          <CardTitle>사용자 검색 및 필터</CardTitle>
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

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <CardDescription>총 {filteredUsers.length}명의 사용자가 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">조건에 맞는 사용자가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.entity_type === 'corporate' ? (
                            <Building className="h-6 w-6 text-gray-600" />
                          ) : (
                            <User className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                          {getStatusBadge(user.registration_status)}
                          <Badge variant="outline">
                            {user.entity_type === 'individual' ? '개인' : '법인'}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {user.phone}
                          </div>
                          <div className="text-xs text-gray-500">
                            가입일: {formatDate(user.created_at)}
                            {user.created_at !== user.updated_at && (
                              <span> • 수정일: {formatDate(user.updated_at)}</span>
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
                  {user.fund_members && user.fund_members.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">출자좌수:</span>
                          <span className="ml-2 text-gray-900">
                            {user.fund_members[0].investment_units.toLocaleString()}좌
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">투자금액:</span>
                          <span className="ml-2 text-gray-900">
                            {formatCurrency(user.fund_members[0].investment_units)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">투자일:</span>
                          <span className="ml-2 text-gray-900">
                            {formatDate(user.fund_members[0].created_at)}
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
