'use client';

/**
 * 결성총회 의안 템플릿 에디터
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react';

interface Agenda {
  title: string;
  content: string;
}

interface FormationAgendaContent {
  title_template: string;
  labels: {
    date: string;
    chairman: string;
    agendas_section: string;
    agenda_title_template: string;
  };
  chairman: string;
  agendas: Agenda[];
  footer_message: string;
}

interface AssemblyFormationAgendaEditorProps {
  content: FormationAgendaContent;
  onChange: (content: FormationAgendaContent) => void;
  readOnly?: boolean;
  originalContent?: FormationAgendaContent;
}

export function AssemblyFormationAgendaEditor({
  content,
  onChange,
  readOnly = false,
  originalContent,
}: AssemblyFormationAgendaEditorProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 값이 변경되었는지 확인
  const isChanged = (currentValue: any, originalValue: any): boolean => {
    if (!originalContent) return false;
    return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
  };

  const handleTitleTemplateChange = (value: string) => {
    onChange({ ...content, title_template: value });
  };

  const handleLabelChange = (
    key: keyof typeof content.labels,
    value: string
  ) => {
    onChange({
      ...content,
      labels: { ...content.labels, [key]: value },
    });
  };

  const handleChairmanChange = (value: string) => {
    onChange({ ...content, chairman: value });
  };

  const handleFooterMessageChange = (value: string) => {
    onChange({ ...content, footer_message: value });
  };

  const handleAgendaChange = (
    index: number,
    field: keyof Agenda,
    value: string
  ) => {
    const newAgendas = [...content.agendas];
    newAgendas[index] = { ...newAgendas[index], [field]: value };
    onChange({ ...content, agendas: newAgendas });
  };

  const handleAddAgenda = () => {
    onChange({
      ...content,
      agendas: [
        ...content.agendas,
        {
          title: '',
          content: '',
        },
      ],
    });
  };

  const handleRemoveAgenda = (index: number) => {
    if (content.agendas.length <= 1) {
      alert('최소 1개의 의안이 필요합니다.');
      return;
    }
    onChange({
      ...content,
      agendas: content.agendas.filter((_, i) => i !== index),
    });
  };

  const handleMoveAgenda = (index: number, direction: 'up' | 'down') => {
    const newAgendas = [...content.agendas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newAgendas.length) {
      return;
    }

    [newAgendas[index], newAgendas[targetIndex]] = [
      newAgendas[targetIndex],
      newAgendas[index],
    ];

    onChange({ ...content, agendas: newAgendas });
  };

  return (
    <div className="space-y-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title_template" className="mb-2 block">
              문서 제목 템플릿
            </Label>
            <Input
              id="title_template"
              value={content.title_template}
              onChange={e => handleTitleTemplateChange(e.target.value)}
              disabled={readOnly}
              placeholder="예: ${fund_name} 결성총회"
              className={
                isChanged(
                  content.title_template,
                  originalContent?.title_template
                )
                  ? 'text-blue-600 font-medium'
                  : ''
              }
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                사용 가능한 변수:
              </span>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => copyToClipboard('${fund_name}')}
              >
                <Copy className="h-3 w-3 mr-1" />
                $&#123;fund_name&#125;
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => copyToClipboard('${assembly_date}')}
              >
                <Copy className="h-3 w-3 mr-1" />
                $&#123;assembly_date&#125;
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 레이블 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>레이블 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label htmlFor="label_date" className="mb-2 block">
                일시 레이블
              </Label>
              <Input
                id="label_date"
                value={content.labels.date}
                onChange={e => handleLabelChange('date', e.target.value)}
                disabled={readOnly}
                placeholder="일시:"
                className={
                  isChanged(content.labels.date, originalContent?.labels.date)
                    ? 'text-blue-600 font-medium'
                    : ''
                }
              />
            </div>
            <div>
              <Label htmlFor="label_chairman" className="mb-2 block">
                의장 레이블
              </Label>
              <Input
                id="label_chairman"
                value={content.labels.chairman}
                onChange={e => handleLabelChange('chairman', e.target.value)}
                disabled={readOnly}
                placeholder="의장:"
                className={
                  isChanged(
                    content.labels.chairman,
                    originalContent?.labels.chairman
                  )
                    ? 'text-blue-600 font-medium'
                    : ''
                }
              />
            </div>
            <div>
              <Label htmlFor="label_agendas_section" className="mb-2 block">
                부의안건 섹션 레이블
              </Label>
              <Input
                id="label_agendas_section"
                value={content.labels.agendas_section}
                onChange={e =>
                  handleLabelChange('agendas_section', e.target.value)
                }
                disabled={readOnly}
                placeholder="부의안건"
                className={
                  isChanged(
                    content.labels.agendas_section,
                    originalContent?.labels.agendas_section
                  )
                    ? 'text-blue-600 font-medium'
                    : ''
                }
              />
            </div>
            <div>
              <Label htmlFor="label_agenda_title" className="mb-2 block">
                의안 제목 템플릿
              </Label>
              <Input
                id="label_agenda_title"
                value={content.labels.agenda_title_template}
                onChange={e =>
                  handleLabelChange('agenda_title_template', e.target.value)
                }
                disabled={readOnly}
                placeholder="(제${index}호 의안) ${title}"
                className={
                  isChanged(
                    content.labels.agenda_title_template,
                    originalContent?.labels.agenda_title_template
                  )
                    ? 'text-blue-600 font-medium'
                    : ''
                }
              />
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  사용 가능한 변수:
                </span>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => copyToClipboard('${index}')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  $&#123;index&#125;
                </Badge>
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => copyToClipboard('${title}')}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  $&#123;title&#125;
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 기본값 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>기본값 설정 (사용자 편집 가능 필드)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chairman" className="mb-2 block">
              의장 (기본값)
            </Label>
            <Input
              id="chairman"
              value={content.chairman}
              onChange={e => handleChairmanChange(e.target.value)}
              disabled={readOnly}
              placeholder="예: 업무집행조합원 프로펠벤처스 대표이사 곽준영"
              className={
                isChanged(content.chairman, originalContent?.chairman)
                  ? 'text-blue-600 font-medium'
                  : ''
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              문서 생성 시 이 값이 기본값으로 표시됩니다.
            </p>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>의안 목록 (기본값)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAgenda}
                disabled={readOnly}
              >
                <Plus className="h-4 w-4 mr-1" />
                의안 추가
              </Button>
            </div>

            <div className="space-y-4">
              {content.agendas.map((agenda, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">
                          제{index + 1}호 의안
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveAgenda(index, 'up')}
                          disabled={readOnly || index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveAgenda(index, 'down')}
                          disabled={
                            readOnly || index === content.agendas.length - 1
                          }
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAgenda(index)}
                          disabled={readOnly || content.agendas.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label
                        htmlFor={`agenda_title_${index}`}
                        className="mb-2 block"
                      >
                        의안 제목
                      </Label>
                      <Input
                        id={`agenda_title_${index}`}
                        value={agenda.title}
                        onChange={e =>
                          handleAgendaChange(index, 'title', e.target.value)
                        }
                        disabled={readOnly}
                        placeholder="의안 제목을 입력하세요"
                        className={
                          isChanged(
                            agenda.title,
                            originalContent?.agendas[index]?.title
                          )
                            ? 'text-blue-600 font-medium'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`agenda_content_${index}`}
                        className="mb-2 block"
                      >
                        의안 내용
                      </Label>
                      <Textarea
                        id={`agenda_content_${index}`}
                        value={agenda.content}
                        onChange={e =>
                          handleAgendaChange(index, 'content', e.target.value)
                        }
                        disabled={readOnly}
                        placeholder="의안 내용을 입력하세요"
                        rows={4}
                        className={
                          isChanged(
                            agenda.content,
                            originalContent?.agendas[index]?.content
                          )
                            ? 'text-blue-600 font-medium'
                            : ''
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <Label htmlFor="footer_message" className="mb-2 block">
              하단 메시지 (기본값)
            </Label>
            <Textarea
              id="footer_message"
              value={content.footer_message}
              onChange={e => handleFooterMessageChange(e.target.value)}
              disabled={readOnly}
              placeholder="예: 위 의안에 대하여 조합원 여러분들의 승인을 부탁드립니다."
              rows={2}
              className={
                isChanged(
                  content.footer_message,
                  originalContent?.footer_message
                )
                  ? 'text-blue-600 font-medium'
                  : ''
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
