'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AgendaItem, FormationAgendaContent } from '@/types/assemblies';
import { Minus, Plus } from 'lucide-react';
import type { DocumentEditorProps } from './types';

/**
 * 결성총회 의안 에디터
 * 의장 정보와 부의안건을 편집할 수 있음
 */
export default function FormationAgendaEditor({
  content,
  onContentChange,
  readOnly = false,
}: DocumentEditorProps<FormationAgendaContent>) {
  const handleAddAgenda = () => {
    const newIndex = content.agendas.length + 1;
    onContentChange({
      ...content,
      agendas: [
        ...content.agendas,
        { index: newIndex, title: '', content: '' },
      ],
    });
  };

  const handleRemoveAgenda = (index: number) => {
    if (content.agendas.length <= 1) return;
    const newAgendas = content.agendas.filter((_, i) => i !== index);
    const reindexedAgendas = newAgendas.map((agenda, i) => ({
      ...agenda,
      index: i + 1,
    }));
    onContentChange({
      ...content,
      agendas: reindexedAgendas,
    });
  };

  const handleAgendaChange = (
    index: number,
    field: keyof AgendaItem,
    value: string
  ) => {
    const newAgendas = [...content.agendas];
    newAgendas[index] = { ...newAgendas[index], [field]: value };
    onContentChange({ ...content, agendas: newAgendas });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="chairman">의장 *</Label>
        <Input
          id="chairman"
          value={content.chairman}
          onChange={e =>
            onContentChange({ ...content, chairman: e.target.value })
          }
          placeholder="예: 업무집행조합원 프로펠벤처스 대표이사 곽준영"
          className="mt-1"
          disabled={readOnly}
        />
      </div>

      <div>
        <Label>부의안건</Label>
        <div className="mt-2 space-y-4">
          {content.agendas.map((agenda, index) => (
            <div key={index} className="border p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Label>제{agenda.index}호 의안</Label>
                {!readOnly && content.agendas.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAgenda(index)}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                value={agenda.title}
                onChange={e =>
                  handleAgendaChange(index, 'title', e.target.value)
                }
                placeholder="의안 제목"
                className="mb-2"
                disabled={readOnly}
              />
              <Textarea
                value={agenda.content}
                onChange={e =>
                  handleAgendaChange(index, 'content', e.target.value)
                }
                placeholder="의안 내용"
                rows={4}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAgenda}
            className="mt-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            의안 추가
          </Button>
        )}
      </div>
    </div>
  );
}
