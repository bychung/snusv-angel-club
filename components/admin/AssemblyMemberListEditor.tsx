'use client';

/**
 * 조합원 명부 템플릿 에디터
 * 자동 생성 문서이지만 테이블 구조와 레이블은 편집 가능
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Info } from 'lucide-react';

interface TableColumn {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
  line_gap?: number;
}

interface MemberListContent {
  title: string;
  table_config: {
    columns: TableColumn[];
  };
  footer_labels: {
    gp_prefix: string;
    seal_text: string;
  };
}

interface AssemblyMemberListEditorProps {
  content: MemberListContent;
  onChange: (content: MemberListContent) => void;
  readOnly?: boolean;
  originalContent?: MemberListContent;
}

export function AssemblyMemberListEditor({
  content,
  onChange,
  readOnly = false,
  originalContent,
}: AssemblyMemberListEditorProps) {
  // 값이 변경되었는지 확인
  const isChanged = (currentValue: any, originalValue: any): boolean => {
    if (!originalContent) return false;
    return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
  };

  const handleTitleChange = (value: string) => {
    onChange({ ...content, title: value });
  };

  const handleColumnChange = (
    index: number,
    field: keyof TableColumn,
    value: string | number
  ) => {
    const newColumns = [...content.table_config.columns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    onChange({
      ...content,
      table_config: { columns: newColumns },
    });
  };

  const handleFooterLabelChange = (
    key: keyof typeof content.footer_labels,
    value: string
  ) => {
    onChange({
      ...content,
      footer_labels: { ...content.footer_labels, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          이 문서는 조합원 정보를 바탕으로 <strong>자동으로 생성</strong>됩니다.
          테이블 구조와 레이블만 편집할 수 있습니다.
        </AlertDescription>
      </Alert>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="title" className="mb-2 block">
              문서 제목
            </Label>
            <Input
              id="title"
              value={content.title}
              onChange={e => handleTitleChange(e.target.value)}
              disabled={readOnly}
              placeholder="조합원 명부"
              className={
                isChanged(content.title, originalContent?.title)
                  ? 'text-blue-600 font-medium'
                  : ''
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 테이블 구조 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>테이블 구조 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              테이블 컬럼의 <strong>key 값은 변경할 수 없습니다</strong>.
              레이블, 너비, 정렬만 수정 가능합니다.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {content.table_config.columns.map((column, index) => (
              <Card key={column.key} className="border-2">
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-mono">
                    {index + 1}. {column.key}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label
                        htmlFor={`col_label_${index}`}
                        className="mb-2 block"
                      >
                        레이블
                      </Label>
                      <Input
                        id={`col_label_${index}`}
                        value={column.label}
                        onChange={e =>
                          handleColumnChange(index, 'label', e.target.value)
                        }
                        disabled={readOnly}
                        placeholder="컬럼 레이블"
                        className={
                          isChanged(
                            column.label,
                            originalContent?.table_config.columns[index]?.label
                          )
                            ? 'text-blue-600 font-medium'
                            : ''
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        여러 줄로 표시하려면 \n 사용
                      </p>
                    </div>
                    <div>
                      <Label
                        htmlFor={`col_width_${index}`}
                        className="mb-2 block"
                      >
                        너비 (px)
                      </Label>
                      <Input
                        id={`col_width_${index}`}
                        type="number"
                        value={column.width}
                        onChange={e =>
                          handleColumnChange(
                            index,
                            'width',
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={readOnly}
                        placeholder="너비"
                        min={20}
                        max={500}
                        className={
                          isChanged(
                            column.width,
                            originalContent?.table_config.columns[index]?.width
                          )
                            ? 'text-blue-600 font-medium'
                            : ''
                        }
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor={`col_align_${index}`}
                        className="mb-2 block"
                      >
                        정렬
                      </Label>
                      <Select
                        value={column.align}
                        onValueChange={value =>
                          handleColumnChange(index, 'align', value)
                        }
                        disabled={readOnly}
                      >
                        <SelectTrigger id={`col_align_${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">왼쪽</SelectItem>
                          <SelectItem value="center">가운데</SelectItem>
                          <SelectItem value="right">오른쪽</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {column.line_gap !== undefined && (
                    <div className="mt-4">
                      <Label
                        htmlFor={`col_line_gap_${index}`}
                        className="mb-2 block"
                      >
                        줄 간격 (선택사항)
                      </Label>
                      <Input
                        id={`col_line_gap_${index}`}
                        type="number"
                        value={column.line_gap}
                        onChange={e =>
                          handleColumnChange(
                            index,
                            'line_gap',
                            parseInt(e.target.value) || 0
                          )
                        }
                        disabled={readOnly}
                        placeholder="줄 간격 (음수 가능)"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        여러 줄 레이블의 줄 간격 조정 (예: -2)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 하단 레이블 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>하단 레이블 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="gp_prefix" className="mb-2 block">
              업무집행조합원 접두사
            </Label>
            <Input
              id="gp_prefix"
              value={content.footer_labels.gp_prefix}
              onChange={e =>
                handleFooterLabelChange('gp_prefix', e.target.value)
              }
              disabled={readOnly}
              placeholder="업무집행조합원"
              className={
                isChanged(
                  content.footer_labels.gp_prefix,
                  originalContent?.footer_labels.gp_prefix
                )
                  ? 'text-blue-600 font-medium'
                  : ''
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              예: "업무집행조합원 프로펠벤처스 대표이사 곽준영"에서
              "업무집행조합원" 부분
            </p>
          </div>

          <div>
            <Label htmlFor="seal_text" className="mb-2 block">
              인감 텍스트
            </Label>
            <Input
              id="seal_text"
              value={content.footer_labels.seal_text}
              onChange={e =>
                handleFooterLabelChange('seal_text', e.target.value)
              }
              disabled={readOnly}
              placeholder="(조합인감)"
              className={
                isChanged(
                  content.footer_labels.seal_text,
                  originalContent?.footer_labels.seal_text
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
