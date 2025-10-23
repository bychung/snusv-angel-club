'use client';

import AssemblyAttendanceSelector from '@/components/admin/AssemblyAttendanceSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { FormationMinutesContent } from '@/types/assemblies';
import { Info } from 'lucide-react';
import type { DocumentEditorProps } from './types';

interface Member {
  id: string;
  name: string;
  type: '업무집행조합원' | '유한책임조합원';
  units: number;
}

interface FormationMinutesEditorProps
  extends DocumentEditorProps<FormationMinutesContent> {
  allMembers?: Member[]; // 전체 조합원 목록 (preview_data에서 전달)
}

/**
 * 결성총회 의사록 에디터
 * 장소, 출석 조합원, 의안별 결과를 편집할 수 있음
 */
export default function FormationMinutesEditor({
  content,
  onContentChange,
  allMembers = [],
  readOnly = false,
}: FormationMinutesEditorProps) {
  // content 구조 검증
  if (!content || !content.sections) {
    return (
      <Alert>
        <AlertDescription>
          의사록 데이터를 불러오는 중입니다... (content 구조:{' '}
          {JSON.stringify(content)})
        </AlertDescription>
      </Alert>
    );
  }

  // 장소 변경
  const handleLocationChange = (value: string) => {
    onContentChange({
      ...content,
      sections: {
        ...content.sections,
        location: {
          ...content.sections.location,
          value,
        },
      },
    });
  };

  // 출석 조합원 변경
  const handleAttendanceChange = (selectedIds: string[]) => {
    onContentChange({
      ...content,
      sections: {
        ...content.sections,
        attendance: {
          ...content.sections.attendance,
          attended_member_ids: selectedIds,
        },
      },
    });
  };

  // 의안 결과 변경
  const handleAgendaResultChange = (index: number, result: string) => {
    const newItems = [...content.sections.agendas.items];
    newItems[index] = { ...newItems[index], result };
    onContentChange({
      ...content,
      sections: {
        ...content.sections,
        agendas: {
          ...content.sections.agendas,
          items: newItems,
        },
      },
    });
  };

  // 의안 결과 옵션
  const resultOptions = [
    '원안대로 승인하다',
    '수정 승인하다',
    '부결하다',
    '계류하다',
  ];

  return (
    <div className="space-y-6">
      {/* 자동 생성 정보 안내 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>자동 생성 정보:</strong> 조합명, 일시, 의장 정보는 '결성총회
          의안'에서 자동으로 가져옵니다.
        </AlertDescription>
      </Alert>

      {/* 장소 입력 */}
      <div>
        <Label htmlFor="location">총회 장소 *</Label>
        <Input
          id="location"
          value={content.sections.location.value}
          onChange={e => handleLocationChange(e.target.value)}
          placeholder="예: 업무집행조합원 회의실 (서면으로 진행)"
          className="mt-1"
          disabled={readOnly}
        />
        <p className="text-sm text-gray-500 mt-1">
          총회가 개최된 장소를 입력하세요.
        </p>
      </div>

      <Separator />

      {/* 출석 조합원 선택 */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          출석 조합원 선택 *
        </Label>
        <p className="text-sm text-gray-500 mb-3">
          총회에 출석한 조합원을 선택하세요. 기본값은 전원 출석입니다.
        </p>
        {allMembers.length > 0 ? (
          <AssemblyAttendanceSelector
            members={allMembers}
            selectedMemberIds={content.sections.attendance.attended_member_ids}
            onSelectionChange={handleAttendanceChange}
            groupByType={true}
            readOnly={readOnly}
          />
        ) : (
          <Alert>
            <AlertDescription>
              조합원 정보를 불러오는 중입니다...
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* 의안 심의 결과 */}
      <div>
        <Label className="text-base font-semibold mb-3 block">
          의안 심의 결과 *
        </Label>
        <p className="text-sm text-gray-500 mb-3">
          각 의안의 승인 결과를 선택하세요.
        </p>
        <div className="space-y-4">
          {content.sections.agendas.items.map((agenda, index) => (
            <div key={index} className="border p-4 rounded-lg bg-gray-50">
              <div className="mb-2">
                <Label className="font-semibold">
                  제{agenda.index}호 의안: {agenda.title}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">결과:</Label>
                <Select
                  value={agenda.result}
                  onValueChange={value =>
                    handleAgendaResultChange(index, value)
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="결과 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {resultOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 검증 메시지 */}
      {content.sections.location.value.trim() === '' && (
        <Alert variant="destructive">
          <AlertDescription>총회 장소를 입력해주세요.</AlertDescription>
        </Alert>
      )}
      {content.sections.attendance.attended_member_ids.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            출석 조합원을 최소 1명 이상 선택해주세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
