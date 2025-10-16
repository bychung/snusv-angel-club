'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  AgendaItem,
  AssemblyDocumentType,
  FormationAgendaContent,
  NextDocumentInfo,
} from '@/types/assemblies';
import { DOCUMENT_TYPE_NAMES } from '@/types/assemblies';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

interface AssemblyCreationModalProps {
  fundId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'type-selection' | 'document-generation' | 'completion';

export default function AssemblyCreationModal({
  fundId,
  isOpen,
  onClose,
  onSuccess,
}: AssemblyCreationModalProps) {
  const [step, setStep] = useState<Step>('type-selection');
  const [assemblyId, setAssemblyId] = useState<string | null>(null);
  const [assemblyDate, setAssemblyDate] = useState<string>('');
  const [currentDocument, setCurrentDocument] =
    useState<NextDocumentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 결성총회 의안 내용
  const [agendaContent, setAgendaContent] = useState<FormationAgendaContent>({
    chairman: '',
    agendas: [
      {
        index: 1,
        title: '규약(안) 승인의 건',
        content: '첨부한 규약 참조 부탁드립니다.',
      },
      {
        index: 2,
        title: '사업계획 승인의 건',
        content:
          '당 조합은 유망한 중소벤처기업에 투자하여 투자수익을 실현하고, 벤처생태계 활성화에 기여하고자 합니다.\n\n주요 투자 분야: IT, 바이오, 제조, 서비스 등 성장 가능성이 높은 중소벤처기업\n투자 방식: 직접 투자 및 간접 투자 병행',
      },
    ],
  });

  const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([]);

  const handleCreateAssembly = async () => {
    if (!assemblyDate) {
      setError('총회 개최일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/funds/${fundId}/assemblies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'formation',
          assembly_date: assemblyDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '총회 생성에 실패했습니다.');
      }

      const data = await response.json();
      setAssemblyId(data.assembly.id);

      // 다음 문서 정보 조회
      await loadNextDocument(data.assembly.id);

      setStep('document-generation');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextDocument = async (asmId: string) => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${asmId}/next-document`
      );

      if (!response.ok) {
        throw new Error('다음 문서 정보 조회에 실패했습니다.');
      }

      const data = await response.json();

      if (data.next_document === null || !data.document_type) {
        // 모든 문서 생성 완료
        setCurrentDocument(null);
        setStep('completion');
      } else {
        setCurrentDocument(data);

        // 기본 컨텐츠가 있으면 설정
        if (data.default_content?.formation_agenda) {
          setAgendaContent(data.default_content.formation_agenda);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    }
  };

  const handleGenerateDocument = async () => {
    if (!assemblyId || !currentDocument) return;

    setIsLoading(true);
    setError(null);

    try {
      let requestBody: any = {
        type: currentDocument.document_type,
      };

      // 편집 가능한 문서의 경우 content 추가
      if (currentDocument.requires_input) {
        if (currentDocument.document_type === 'formation_agenda') {
          // 의장 필수 체크
          if (!agendaContent.chairman.trim()) {
            setError('의장을 입력해주세요.');
            setIsLoading(false);
            return;
          }

          requestBody.content = {
            formation_agenda: agendaContent,
          };
        }
      }

      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '문서 생성에 실패했습니다.');
      }

      const data = await response.json();

      // 생성된 문서 목록에 추가
      setGeneratedDocuments(prev => [...prev, currentDocument.document_type]);

      if (data.all_documents_completed) {
        // 모든 문서 생성 완료
        setStep('completion');
      } else {
        // 다음 문서로 이동
        await loadNextDocument(assemblyId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAgenda = () => {
    const newIndex = agendaContent.agendas.length + 1;
    setAgendaContent({
      ...agendaContent,
      agendas: [
        ...agendaContent.agendas,
        { index: newIndex, title: '', content: '' },
      ],
    });
  };

  const handleRemoveAgenda = (index: number) => {
    if (agendaContent.agendas.length <= 1) return;

    const newAgendas = agendaContent.agendas.filter((_, i) => i !== index);
    // 인덱스 재정렬
    const reindexedAgendas = newAgendas.map((agenda, i) => ({
      ...agenda,
      index: i + 1,
    }));

    setAgendaContent({
      ...agendaContent,
      agendas: reindexedAgendas,
    });
  };

  const handleAgendaChange = (
    index: number,
    field: keyof AgendaItem,
    value: string
  ) => {
    const newAgendas = [...agendaContent.agendas];
    newAgendas[index] = {
      ...newAgendas[index],
      [field]: value,
    };
    setAgendaContent({
      ...agendaContent,
      agendas: newAgendas,
    });
  };

  const handleClose = () => {
    // 초기화
    setStep('type-selection');
    setAssemblyId(null);
    setAssemblyDate('');
    setCurrentDocument(null);
    setGeneratedDocuments([]);
    setError(null);
    onClose();
  };

  const handleFinish = () => {
    handleClose();
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'type-selection' && '총회 생성'}
            {step === 'document-generation' && '결성총회 문서 생성'}
            {step === 'completion' && '결성총회 문서 생성 완료'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: 총회 종류 선택 */}
        {step === 'type-selection' && (
          <div className="space-y-4">
            <div>
              <Label>총회 종류를 선택하세요</Label>
              <div className="mt-2 p-4 border rounded-lg">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="formation"
                    name="assembly-type"
                    checked
                    readOnly
                    className="mr-2"
                  />
                  <label htmlFor="formation">결성총회</label>
                </div>
                <div className="flex items-center mt-2 opacity-50">
                  <input
                    type="radio"
                    id="special"
                    name="assembly-type"
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="special">임시총회 (비활성화)</label>
                </div>
                <div className="flex items-center mt-2 opacity-50">
                  <input
                    type="radio"
                    id="regular"
                    name="assembly-type"
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="regular">정기총회 (비활성화)</label>
                </div>
                <div className="flex items-center mt-2 opacity-50">
                  <input
                    type="radio"
                    id="dissolution"
                    name="assembly-type"
                    disabled
                    className="mr-2"
                  />
                  <label htmlFor="dissolution">해산/청산총회 (비활성화)</label>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="assembly-date">총회 개최일</Label>
              <Input
                id="assembly-date"
                type="date"
                value={assemblyDate}
                onChange={e => setAssemblyDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <Alert>
              <AlertDescription>
                ⓘ 현재는 결성총회만 생성 가능합니다. 추후 다른 총회 유형이
                추가될 예정입니다.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button onClick={handleCreateAssembly} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '다음: 문서 생성'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 문서 생성 */}
        {step === 'document-generation' && currentDocument && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium">
                📄{' '}
                {
                  DOCUMENT_TYPE_NAMES[
                    currentDocument.document_type as AssemblyDocumentType
                  ]
                }
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {generatedDocuments.length + 1} / 2
              </p>
            </div>

            {/* 조합원 명부 (자동 생성) */}
            {currentDocument.document_type === 'formation_member_list' && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  이 문서는 현재 펀드의 조합원 정보를 바탕으로 자동으로
                  생성됩니다.
                </p>
              </div>
            )}

            {/* 결성총회 의안 (편집 가능) */}
            {currentDocument.document_type === 'formation_agenda' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  의안 내용을 검토하고 필요시 수정하세요.
                </p>

                <div>
                  <Label htmlFor="chairman">의장 *</Label>
                  <Input
                    id="chairman"
                    value={agendaContent.chairman}
                    onChange={e =>
                      setAgendaContent({
                        ...agendaContent,
                        chairman: e.target.value,
                      })
                    }
                    placeholder="예: 업무집행조합원 프로펠벤처스 대표이사 곽준영"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>부의안건</Label>
                  <div className="mt-2 space-y-4">
                    {agendaContent.agendas.map((agenda, index) => (
                      <div key={index} className="border p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Label>제{agenda.index}호 의안</Label>
                          {agendaContent.agendas.length > 1 && (
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
                        />
                        <Textarea
                          value={agenda.content}
                          onChange={e =>
                            handleAgendaChange(index, 'content', e.target.value)
                          }
                          placeholder="의안 내용"
                          rows={4}
                        />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddAgenda}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    의안 추가
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('type-selection')}
                disabled={isLoading}
              >
                이전
              </Button>
              <Button onClick={handleGenerateDocument} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  '저장 후 다음'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 'completion' && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-semibold mb-2">
                모든 문서가 생성되었습니다!
              </h3>

              <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
                <p className="font-medium mb-2">생성된 문서:</p>
                <ul className="space-y-1">
                  {generatedDocuments.map(docType => (
                    <li key={docType} className="text-sm flex items-center">
                      <span className="mr-2">•</span>
                      {DOCUMENT_TYPE_NAMES[docType as AssemblyDocumentType]}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 text-left bg-blue-50 p-4 rounded-lg">
                <p className="font-medium mb-2">다음 단계:</p>
                <ul className="space-y-1 text-sm">
                  <li>• 총회 목록에서 문서를 확인할 수 있습니다</li>
                  <li>• 조합원들에게 이메일로 발송할 수 있습니다</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleFinish}>
                닫기
              </Button>
              <Button onClick={handleFinish}>확인</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
