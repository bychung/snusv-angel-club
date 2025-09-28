'use client';

import { MemberWithFund } from '@/lib/admin/members';
import { useState } from 'react';
import MemberSearchAndFilter from './MemberSearchAndFilter';
import MemberTable from './MemberTable';

interface UserManagementProps {
  members: MemberWithFund[];
}

export default function UserManagement({ members }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'registered' | 'survey_only'
  >('registered'); // 사용자 페이지는 기본값이 'registered'

  return (
    <div className="space-y-8">
      {/* 검색 및 필터 */}
      <MemberSearchAndFilter
        mode="users"
        onSearchChange={setSearchTerm}
        onFilterChange={setFilterStatus}
      />

      {/* 사용자 목록 */}
      <MemberTable
        members={members}
        mode="users"
        searchTerm={searchTerm}
        filterStatus={filterStatus}
      />
    </div>
  );
}
