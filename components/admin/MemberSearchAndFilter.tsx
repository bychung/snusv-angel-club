'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Filter, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface MemberSearchAndFilterProps {
  mode: 'users' | 'fund_members';
}

export default function MemberSearchAndFilter({ mode }: MemberSearchAndFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'survey_only'>(
    (searchParams.get('filter') as any) || (mode === 'users' ? 'registered' : 'all')
  );

  // URL 업데이트
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }

    if (filterStatus !== 'all') {
      params.set('filter', filterStatus);
    } else {
      params.delete('filter');
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(newUrl, { scroll: false });
  }, [searchTerm, filterStatus, router, searchParams]);

  const getSearchTitle = () => {
    return mode === 'fund_members' ? '조합원 검색 및 필터' : '사용자 검색 및 필터';
  };

  return (
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
  );
}
