'use client';

import { getNameForSorting } from '@/lib/format-utils';
import { useEffect, useState } from 'react';
import type { DocumentEditorProps } from './types';

interface FundMember {
  id: string;
  name: string;
  investment_amount: number;
  email: string;
  phone?: string;
  address?: string;
}

/**
 * 조합원 명부 에디터
 * 자동 생성되는 문서로 별도 입력이 필요하지 않음
 */
export default function FormationMemberListEditor({
  fundId,
}: DocumentEditorProps) {
  const [members, setMembers] = useState<FundMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [fundId]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      // 펀드 상세 정보 가져오기 (par_value 필요)
      const fundResponse = await fetch(`/api/admin/funds/${fundId}/details`);
      if (!fundResponse.ok) {
        throw new Error('펀드 정보 조회 실패');
      }
      const fundData = await fundResponse.json();
      const parValue = fundData.fund?.par_value || 10000;

      // 펀드 멤버 목록 가져오기
      const membersResponse = await fetch(`/api/admin/funds/${fundId}/members`);

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        const processedMembers = (membersData.members || [])
          .sort((a: any, b: any) => {
            const nameA = getNameForSorting(a.name);
            const nameB = getNameForSorting(b.name);
            return nameA.localeCompare(nameB, 'ko-KR');
          })
          .map((member: any) => ({
            id: member.id,
            name: member.name,
            investment_amount: (member.total_units || 0) * parValue,
            email: member.email,
            phone: member.phone,
            address: member.address,
          }));
        setMembers(processedMembers);
      } else {
        console.error('멤버 목록 조회 실패');
      }
    } catch (error) {
      console.error('조합원 정보 로드 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        아래 조합원 정보가 명부에 포함됩니다. (가나다순 정렬)
      </p>

      {isLoading ? (
        <div className="text-sm text-gray-500">조합원 정보 로딩 중...</div>
      ) : members.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  이름
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">
                  출자금액
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">
                  이메일
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={member.id} className="border-b last:border-b-0">
                  <td className="px-4 py-2">{member.name}</td>
                  <td className="px-4 py-2 text-right">
                    {member.investment_amount.toLocaleString()}원
                  </td>
                  <td className="px-4 py-2 text-gray-600">{member.email}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td className="px-4 py-2 font-medium">총 {members.length}명</td>
                <td className="px-4 py-2 text-right font-medium">
                  {members
                    .reduce((sum, m) => sum + m.investment_amount, 0)
                    .toLocaleString()}
                  원
                </td>
                <td className="px-4 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-sm text-gray-500 py-4 text-center border rounded-lg">
          조합원 정보가 없습니다.
        </div>
      )}
    </div>
  );
}
