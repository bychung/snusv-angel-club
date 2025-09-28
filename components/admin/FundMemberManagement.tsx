'use client';

import { MemberWithFund } from '@/lib/admin/members';
import { useState } from 'react';
import MemberSearchAndFilter from './MemberSearchAndFilter';
import MemberTable from './MemberTable';

interface FundMemberManagementProps {
  members: MemberWithFund[];
  fundId: string;
  fundName: string;
}

export default function FundMemberManagement({
  members,
  fundId,
  fundName,
}: FundMemberManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'registered' | 'survey_only'
  >('all');

  return (
    <div className="space-y-8">
      {/* 검색 및 필터 */}
      <MemberSearchAndFilter
        mode="fund_members"
        onSearchChange={setSearchTerm}
        onFilterChange={setFilterStatus}
      />

      {/* 조합원 목록 */}
      <MemberTable
        members={members}
        mode="fund_members"
        fundId={fundId}
        fundName={fundName}
        searchTerm={searchTerm}
        filterStatus={filterStatus}
      />
    </div>
  );
}
