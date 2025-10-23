'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Member {
  id: string;
  name: string;
  type: '업무집행조합원' | '유한책임조합원';
  units: number;
}

interface AssemblyAttendanceSelectorProps {
  members: Member[]; // 전체 조합원 목록
  selectedMemberIds: string[]; // 선택된 조합원 ID 목록
  onSelectionChange: (selectedIds: string[]) => void;
  groupByType?: boolean; // 구분(GP/LP)별로 그룹화 여부 (기본: true)
  readOnly?: boolean; // 읽기 전용 모드
}

/**
 * 조합원 총회 출석자 선택 컴포넌트
 * 재사용 가능하도록 설계됨
 */
export default function AssemblyAttendanceSelector({
  members,
  selectedMemberIds,
  onSelectionChange,
  groupByType = true,
  readOnly = false,
}: AssemblyAttendanceSelectorProps) {
  // 전체 선택 여부
  const allSelected = selectedMemberIds.length === members.length;
  const someSelected =
    selectedMemberIds.length > 0 && selectedMemberIds.length < members.length;

  // GP/LP 분리
  const gps = members.filter(m => m.type === '업무집행조합원');
  const lps = members.filter(m => m.type === '유한책임조합원');

  // 전체 선택/해제 토글
  const handleToggleAll = () => {
    if (readOnly) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(members.map(m => m.id));
    }
  };

  // 개별 조합원 토글
  const handleToggleMember = (memberId: string) => {
    if (readOnly) return;
    if (selectedMemberIds.includes(memberId)) {
      onSelectionChange(selectedMemberIds.filter(id => id !== memberId));
    } else {
      onSelectionChange([...selectedMemberIds, memberId]);
    }
  };

  // 그룹별 선택/해제 (GP 또는 LP)
  const handleToggleGroup = (groupMembers: Member[]) => {
    if (readOnly) return;
    const groupIds = groupMembers.map(m => m.id);
    const allGroupSelected = groupIds.every(id =>
      selectedMemberIds.includes(id)
    );

    if (allGroupSelected) {
      // 그룹 전체 해제
      onSelectionChange(selectedMemberIds.filter(id => !groupIds.includes(id)));
    } else {
      // 그룹 전체 선택
      const newSelection = new Set([...selectedMemberIds, ...groupIds]);
      onSelectionChange(Array.from(newSelection));
    }
  };

  const renderMemberCheckbox = (member: Member) => {
    const isChecked = selectedMemberIds.includes(member.id);
    return (
      <div
        key={member.id}
        className="flex items-center space-x-3 py-2 hover:bg-gray-50 px-2 rounded"
      >
        <Checkbox
          id={`member-${member.id}`}
          checked={isChecked}
          onCheckedChange={() => handleToggleMember(member.id)}
          disabled={readOnly}
        />
        <Label
          htmlFor={`member-${member.id}`}
          className="flex-1 cursor-pointer text-sm"
        >
          {member.name} ({member.units}좌)
        </Label>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 전체 선택/해제 */}
      <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
        <Checkbox
          id="select-all"
          checked={allSelected}
          ref={input => {
            if (input) {
              (input as any).indeterminate = someSelected;
            }
          }}
          onCheckedChange={handleToggleAll}
          disabled={readOnly}
        />
        <Label htmlFor="select-all" className="cursor-pointer font-semibold">
          전체 선택 ({selectedMemberIds.length}명 / {members.length}명)
        </Label>
      </div>

      {/* 조합원 목록 */}
      <ScrollArea className="h-[400px] border rounded-lg p-4">
        {groupByType ? (
          <div className="space-y-4">
            {/* 업무집행조합원 */}
            {gps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold text-gray-700">
                    업무집행조합원
                  </Label>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleGroup(gps)}
                      className="h-7 text-xs"
                    >
                      {gps.every(gp => selectedMemberIds.includes(gp.id))
                        ? '전체 해제'
                        : '전체 선택'}
                    </Button>
                  )}
                </div>
                {gps.map(renderMemberCheckbox)}
              </div>
            )}

            {gps.length > 0 && lps.length > 0 && <Separator />}

            {/* 유한책임조합원 */}
            {lps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="font-semibold text-gray-700">
                    유한책임조합원
                  </Label>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleGroup(lps)}
                      className="h-7 text-xs"
                    >
                      {lps.every(lp => selectedMemberIds.includes(lp.id))
                        ? '전체 해제'
                        : '전체 선택'}
                    </Button>
                  )}
                </div>
                {lps.map(renderMemberCheckbox)}
              </div>
            )}
          </div>
        ) : (
          // 그룹화 없이 전체 목록
          <div>{members.map(renderMemberCheckbox)}</div>
        )}
      </ScrollArea>

      {/* 선택 통계 */}
      <div className="text-sm text-gray-600">
        선택된 조합원: {selectedMemberIds.length}명 / 전체 {members.length}명
      </div>
    </div>
  );
}

// Button 컴포넌트 import 추가 필요 (missing import 해결)
import { Button } from '@/components/ui/button';
