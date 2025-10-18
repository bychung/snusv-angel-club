'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AssemblyDocument,
  AssemblyDocumentType,
  AssemblyType,
  NextDocumentInfo,
} from '@/types/assemblies';
import {
  ASSEMBLY_DOCUMENT_TYPES,
  DOCUMENT_TYPE_NAMES,
} from '@/types/assemblies';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getEditorConfig } from './assembly-documents';
import DocumentEditorActions from './assembly-documents/DocumentEditorActions';

/**
 * Base64 문자열을 Blob으로 변환하는 헬퍼 함수
 */
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

interface AssemblyDocumentGenerationModalProps {
  fundId: string;
  assemblyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  readOnly?: boolean; // 읽기 전용 모드 (발송 완료 상태에서 사용)
}

type Step = 'document-generation' | 'completion';
type ViewMode = 'edit' | 'preview';

export default function AssemblyDocumentGenerationModal({
  fundId,
  assemblyId,
  isOpen,
  onClose,
  onSuccess,
  readOnly = false,
}: AssemblyDocumentGenerationModalProps) {
  const [step, setStep] = useState<Step>('document-generation');
  const [currentDocument, setCurrentDocument] =
    useState<NextDocumentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 미리보기 관련 상태
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [currentDocumentContent, setCurrentDocumentContent] =
    useState<any>(null);

  // 뷰 모드 관련 상태
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [hasEditedContent, setHasEditedContent] = useState(false); // 편집 후 미리보기 여부

  // 문서 네비게이션 관련
  const [assemblyType, setAssemblyType] = useState<AssemblyType>('formation');
  const [documentTypeOrder, setDocumentTypeOrder] = useState<
    AssemblyDocumentType[]
  >([]);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState<number>(0);
  const [existingDocuments, setExistingDocuments] = useState<
    AssemblyDocument[]
  >([]);

  // 문서별 content 관리 (범용적으로 변경)
  const [documentContents, setDocumentContents] = useState<Record<string, any>>(
    {}
  );

  // 생성된 문서 목록
  const [generatedDocuments, setGeneratedDocuments] = useState<string[]>([]);

  // 모달 오픈 시 총회 정보 및 문서 순서 로드
  useEffect(() => {
    if (isOpen && assemblyId) {
      loadAssemblyAndDocuments();
    }
  }, [isOpen, assemblyId]);

  const loadAssemblyAndDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 총회 상세 정보 조회 (문서 포함)
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}`
      );

      if (!response.ok) {
        throw new Error('총회 정보 조회에 실패했습니다.');
      }

      const data = await response.json();
      const assembly = data.assembly;

      // 총회 타입 및 문서 순서 설정
      setAssemblyType(assembly.type);
      const docTypes = ASSEMBLY_DOCUMENT_TYPES[assembly.type as AssemblyType];
      setDocumentTypeOrder(docTypes);

      // 기존 문서 저장
      setExistingDocuments(assembly.documents || []);

      // 생성된 문서 타입 목록 업데이트
      const generatedTypes = (assembly.documents || []).map(
        (doc: AssemblyDocument) => doc.type
      );
      setGeneratedDocuments(generatedTypes);

      // 다음 생성할 문서 찾기
      const nextDocIndex = docTypes.findIndex(
        type => !generatedTypes.includes(type)
      );

      if (nextDocIndex === -1) {
        // 모든 문서 생성 완료 - 첫 번째 문서부터 보여주기
        setCurrentDocumentIndex(0);
        await loadDocumentAtIndex(0, docTypes, assembly.documents);
      } else {
        // 다음 생성할 문서로 이동
        setCurrentDocumentIndex(nextDocIndex);
        await loadDocumentAtIndex(nextDocIndex, docTypes, assembly.documents);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocumentAtIndex = async (
    index: number,
    docTypes: AssemblyDocumentType[],
    docs: AssemblyDocument[]
  ) => {
    const documentType = docTypes[index];
    const existingDoc = docs.find(
      (d: AssemblyDocument) => d.type === documentType
    );

    // 에디터 설정 가져오기
    const editorConfig = getEditorConfig(documentType);

    // 기존 문서가 있으면 미리보기 모드로 시작
    if (existingDoc && existingDoc.pdf_storage_path) {
      // content가 있으면 로드 (나중에 편집 모드로 전환할 때 사용)
      if (existingDoc.content && existingDoc.content.formation_agenda) {
        setDocumentContents(prev => ({
          ...prev,
          [documentType]: existingDoc.content!.formation_agenda,
        }));
      }
      await loadExistingDocumentPreview(existingDoc, documentType);
      setViewMode('preview');
      setIsEditingExisting(true);
      setHasEditedContent(false); // 기존 문서 로드
      return;
    }

    // 읽기 전용 모드에서는 문서가 없으면 다음으로 이동
    if (readOnly) {
      if (index < docTypes.length - 1) {
        await loadDocumentAtIndex(index + 1, docTypes, docs);
      }
      return;
    }

    // 새 문서인 경우 편집 모드로 시작
    setViewMode('edit');
    setIsEditingExisting(false);
    setHasEditedContent(false);

    // 기본 content 초기화
    if (editorConfig && !documentContents[documentType]) {
      setDocumentContents(prev => ({
        ...prev,
        [documentType]: editorConfig.getDefaultContent(),
      }));
    }

    // 편집 모드: 기존 문서가 있으면 content 로드
    if (existingDoc?.content && existingDoc.content.formation_agenda) {
      setDocumentContents(prev => ({
        ...prev,
        [documentType]: existingDoc.content!.formation_agenda,
      }));
    }

    // next-document API 호출하여 기본 정보 가져오기
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/next-document`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.document_type === documentType) {
          setCurrentDocument(data);
          setStep('document-generation');
          return;
        }
      }
    } catch (err) {
      console.error('next-document API 호출 실패:', err);
    }

    // API 호출 실패 시 기본 정보 생성
    setCurrentDocument({
      document_type: documentType,
      requires_input: editorConfig?.requiresInput || false,
      next_document: index < docTypes.length - 1 ? docTypes[index + 1] : null,
    } as NextDocumentInfo);
    setStep('document-generation');
  };

  const loadExistingDocumentPreview = async (
    doc: AssemblyDocument,
    documentType: AssemblyDocumentType
  ) => {
    setIsLoading(true);
    try {
      // Storage에서 PDF 가져오기
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/${doc.id}/preview`
      );

      if (!response.ok) {
        throw new Error('문서 미리보기 로드에 실패했습니다.');
      }

      const pdfBlob = await response.blob();
      const blobUrl = URL.createObjectURL(pdfBlob);

      // 미리보기 상태 설정
      setPreviewBlobUrl(blobUrl);
      setCurrentDocumentContent(doc.content || null);

      // 현재 문서 정보 설정
      setCurrentDocument({
        document_type: documentType,
        requires_input: documentType === 'formation_agenda',
        next_document: null,
      } as NextDocumentInfo);

      setStep('document-generation');
    } catch (err) {
      console.error('문서 미리보기 로드 실패:', err);
      // 실패 시 편집 모드로 폴백
      setCurrentDocument({
        document_type: documentType,
        requires_input: documentType === 'formation_agenda',
        next_document: null,
      } as NextDocumentInfo);
      setStep('document-generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!currentDocument) return;

    const editorConfig = getEditorConfig(currentDocument.document_type);
    if (!editorConfig) return;

    // 현재 문서의 content 가져오기
    const currentContent =
      documentContents[currentDocument.document_type] ||
      editorConfig.getDefaultContent();

    setIsLoading(true);
    setError(null);

    try {
      // 유효성 검사
      if (editorConfig.validate) {
        const validationError = editorConfig.validate(currentContent);
        if (validationError) {
          setError(validationError);
          setIsLoading(false);
          return;
        }
      }

      let requestBody: any = {
        type: currentDocument.document_type,
      };

      // 편집 가능한 문서의 경우 content 추가
      if (editorConfig.requiresInput) {
        if (currentDocument.document_type === 'formation_agenda') {
          requestBody.content = {
            formation_agenda: currentContent,
          };
        }
      }

      // PDF 생성 (Buffer만 반환, Storage/DB 저장 안 함)
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

      // Content 저장 (다음 버튼 클릭 시 사용)
      setCurrentDocumentContent(data.content);

      // Base64 PDF를 Blob으로 변환하여 미리보기 URL 생성
      const pdfBlob = base64ToBlob(data.pdf_base64, 'application/pdf');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPreviewBlobUrl(blobUrl);

      // 미리보기 모드로 전환
      setViewMode('preview');
      setHasEditedContent(true); // 편집 후 미리보기
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 편집하기 버튼 (기존 문서 미리보기 → 편집)
  const handleStartEdit = () => {
    setViewMode('edit');
    setIsEditingExisting(true);
    setHasEditedContent(false);
    // 미리보기 Blob URL 정리
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  // 다시 편집 버튼 (편집 후 미리보기 → 편집)
  const handleEditAgain = () => {
    setViewMode('edit');
    // 미리보기 Blob URL 정리
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  // 다음 버튼 (미리보기에서)
  const handleNextFromPreview = () => {
    const nextIndex = currentDocumentIndex + 1;
    // 미리보기 Blob URL 정리
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
    setCurrentDocumentContent(null);

    if (nextIndex >= documentTypeOrder.length) {
      setStep('completion');
    } else {
      setCurrentDocumentIndex(nextIndex);
      loadDocumentAtIndex(nextIndex, documentTypeOrder, existingDocuments);
    }
  };

  // 취소 버튼 (편집 중)
  const handleCancelEdit = () => {
    if (isEditingExisting) {
      // 기존 문서 편집 중이었으면 미리보기로 복귀
      const existingDoc = existingDocuments.find(
        d => d.type === currentDocument?.document_type
      );
      if (existingDoc) {
        loadExistingDocumentPreview(existingDoc, existingDoc.type);
        setViewMode('preview');
        setHasEditedContent(false);
      }
    } else {
      // 새 문서 생성 중이었으면 모달 닫기 확인
      if (
        confirm('작성 중인 내용이 저장되지 않습니다. 정말 취소하시겠습니까?')
      ) {
        handleClose();
      }
    }
  };

  const handleSaveDocument = async () => {
    if (!currentDocument) return;

    setIsLoading(true);
    setError(null);

    try {
      // PDF 재생성 후 Storage 업로드 및 DB 저장
      const saveResponse = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: currentDocument.document_type,
            content: currentDocumentContent,
          }),
        }
      );

      if (!saveResponse.ok) {
        const data = await saveResponse.json();
        throw new Error(data.error || '문서 저장에 실패했습니다.');
      }

      const saveData = await saveResponse.json();

      // 저장된 문서 정보를 existingDocuments에 추가
      const savedDocument: AssemblyDocument = {
        id: saveData.document_id,
        assembly_id: assemblyId,
        type: currentDocument.document_type,
        content: currentDocumentContent,
        pdf_storage_path: `assemblies/${assemblyId}/${currentDocument.document_type}.pdf`,
        generated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 기존 문서 목록 업데이트 (같은 타입 제거 후 새 문서 추가)
      const updatedDocs = [
        ...existingDocuments.filter(
          d => d.type !== currentDocument.document_type
        ),
        savedDocument,
      ];
      setExistingDocuments(updatedDocs);

      // 생성된 문서 목록에 추가
      setGeneratedDocuments(prev => [...prev, currentDocument.document_type]);

      // 미리보기 상태 초기화
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(null);
      setCurrentDocumentContent(null);

      // 다음 문서 로드
      const nextIndex = currentDocumentIndex + 1;
      if (nextIndex >= documentTypeOrder.length) {
        // 모든 문서 생성 완료
        setStep('completion');
      } else {
        setCurrentDocumentIndex(nextIndex);
        await loadDocumentAtIndex(nextIndex, documentTypeOrder, updatedDocs);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Blob URL 정리
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }

    // 초기화
    setStep('document-generation');
    setCurrentDocument(null);
    setGeneratedDocuments([]);
    setError(null);
    setPreviewBlobUrl(null);
    setCurrentDocumentContent(null);
    setCurrentDocumentIndex(0);
    setExistingDocuments([]);
    setViewMode('edit');
    setIsEditingExisting(false);
    setHasEditedContent(false);
    setDocumentContents({});

    onClose();
  };

  const handleFinish = () => {
    handleClose();
    // 읽기 전용 모드에서는 새로고침 불필요 (아무것도 수정하지 않음)
    if (!readOnly) {
      onSuccess();
    }
  };

  const handleGoBackFromCompletion = () => {
    // 완료 화면에서 이전으로 가기 - 마지막 문서로 이동
    const lastIndex = documentTypeOrder.length - 1;
    if (lastIndex >= 0) {
      setCurrentDocumentIndex(lastIndex);
      loadDocumentAtIndex(lastIndex, documentTypeOrder, existingDocuments);
    }
  };

  const handleNavigateToPrevious = () => {
    const prevIndex = currentDocumentIndex - 1;
    if (prevIndex >= 0) {
      // 미리보기 초기화
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
      setPreviewBlobUrl(null);
      setCurrentDocumentContent(null);

      setCurrentDocumentIndex(prevIndex);
      loadDocumentAtIndex(prevIndex, documentTypeOrder, existingDocuments);
    }
  };

  const handleNavigateToPreviousReadOnly = async () => {
    // 읽기 전용 모드에서 이전 버튼: 이전에 생성된 문서가 있는 곳으로만 이동
    let prevIndex = currentDocumentIndex - 1;
    while (prevIndex >= 0) {
      const docType = documentTypeOrder[prevIndex];
      const existingDoc = existingDocuments.find(d => d.type === docType);
      if (existingDoc && existingDoc.pdf_storage_path) {
        // 문서가 존재하면 이동
        if (previewBlobUrl) {
          URL.revokeObjectURL(previewBlobUrl);
        }
        setPreviewBlobUrl(null);
        setCurrentDocumentContent(null);
        setCurrentDocumentIndex(prevIndex);
        await loadDocumentAtIndex(
          prevIndex,
          documentTypeOrder,
          existingDocuments
        );
        return;
      }
      prevIndex--;
    }
    // 이전에 생성된 문서가 없으면 이동하지 않음
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={`${
          previewBlobUrl
            ? 'w-[95vw] max-w-[1600px] sm:max-w-7xl h-[90vh]'
            : 'max-w-2xl sm:max-w-2xl max-h-[90vh]'
        } flex flex-col p-0 overflow-hidden`}
      >
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>
            {step === 'document-generation' && '결성총회 문서 생성'}
            {step === 'completion' && '결성총회 문서 생성 완료'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 overflow-y-auto flex-1 min-h-0">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: 문서 생성 */}
          {step === 'document-generation' && currentDocument && (
            <div
              className={`flex flex-col pb-6 ${
                viewMode === 'preview' ? 'h-full' : 'space-y-4'
              }`}
            >
              <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
                <p className="text-md font-medium">
                  📄{' '}
                  {
                    DOCUMENT_TYPE_NAMES[
                      currentDocument.document_type as AssemblyDocumentType
                    ]
                  }{' '}
                  <span className="text-xs text-gray-600 ml-2">
                    {currentDocumentIndex + 1} / {documentTypeOrder.length}
                  </span>
                  {viewMode === 'preview' && !hasEditedContent && (
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      저장됨
                    </span>
                  )}
                  {viewMode === 'edit' && !isEditingExisting && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      새로 작성
                    </span>
                  )}
                </p>
              </div>

              {viewMode === 'edit' ? (
                // 편집 모드 - 동적 렌더링
                <div className="space-y-4 mt-4">
                  {(() => {
                    const editorConfig = getEditorConfig(
                      currentDocument.document_type
                    );
                    if (!editorConfig) return null;

                    const currentContent =
                      documentContents[currentDocument.document_type] ||
                      editorConfig.getDefaultContent();

                    const EditorComponent = editorConfig.EditorComponent;

                    return (
                      <>
                        {/* 안내 메시지 */}
                        {editorConfig.description && (
                          <p className="text-sm text-gray-600">
                            {editorConfig.description}
                          </p>
                        )}

                        {/* 동적 에디터 렌더링 */}
                        <EditorComponent
                          content={currentContent}
                          onContentChange={newContent => {
                            setDocumentContents(prev => ({
                              ...prev,
                              [currentDocument.document_type]: newContent,
                            }));
                          }}
                          isLoading={isLoading}
                          error={error}
                          readOnly={readOnly}
                          fundId={fundId}
                          assemblyId={assemblyId}
                          documentType={currentDocument.document_type}
                        />

                        {/* 공통 버튼 영역 */}
                        <DocumentEditorActions
                          onPreview={handleGenerateDocument}
                          onCancel={readOnly ? handleClose : handleCancelEdit}
                          onPrevious={handleNavigateToPrevious}
                          showPrevious={currentDocumentIndex > 0 && !readOnly}
                          showPreview={!readOnly}
                          isLoading={isLoading}
                          readOnly={readOnly}
                        />
                      </>
                    );
                  })()}
                </div>
              ) : (
                // 미리보기 모드
                <div className="flex flex-col flex-1 min-h-0 mt-4">
                  {/* 안내 메시지 */}
                  {!hasEditedContent && !readOnly && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3 flex-shrink-0">
                      <p className="text-sm text-blue-800">
                        ℹ️ 이미 생성된 문서입니다. 수정이 필요한 경우
                        &quot;편집하기&quot;를 클릭하세요.
                      </p>
                    </div>
                  )}
                  {readOnly && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-3 flex-shrink-0">
                      <p className="text-sm text-gray-700">
                        ℹ️ 읽기 전용 모드입니다. 이미 발송된 문서는 수정할 수
                        없습니다.
                      </p>
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="bg-gray-100 px-4 py-2 border-b flex-shrink-0">
                      <p className="text-sm font-medium">문서 미리보기</p>
                    </div>
                    <div className="flex-1 h-full">
                      {previewBlobUrl && (
                        <iframe
                          src={`${previewBlobUrl}#zoom=125`}
                          className="w-full h-full"
                          title="문서 미리보기"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
                    {currentDocumentIndex > 0 && (
                      <Button
                        variant="outline"
                        onClick={
                          readOnly
                            ? handleNavigateToPreviousReadOnly
                            : handleNavigateToPrevious
                        }
                        disabled={isLoading}
                      >
                        이전
                      </Button>
                    )}
                    {!(
                      readOnly &&
                      currentDocumentIndex === documentTypeOrder.length - 1
                    ) && (
                      <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                      >
                        취소
                      </Button>
                    )}
                    {readOnly ? (
                      // 읽기 전용 모드: [이전] [취소] [다음/닫기]
                      <>
                        {currentDocumentIndex < documentTypeOrder.length - 1 ? (
                          <Button
                            onClick={handleNextFromPreview}
                            disabled={isLoading}
                          >
                            다음
                          </Button>
                        ) : (
                          <Button onClick={handleFinish}>닫기</Button>
                        )}
                      </>
                    ) : hasEditedContent ? (
                      // 편집 후 미리보기: [취소] [다시 편집] [문서 저장]
                      <>
                        <Button
                          variant="outline"
                          onClick={handleEditAgain}
                          disabled={isLoading}
                        >
                          {'다시 편집'}
                        </Button>
                        <Button
                          onClick={handleSaveDocument}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              처리 중...
                            </>
                          ) : (
                            '문서 저장'
                          )}
                        </Button>
                      </>
                    ) : (
                      // 기존 문서 미리보기: [취소] [편집하기] [다음]
                      <>
                        <Button
                          variant="outline"
                          onClick={handleStartEdit}
                          disabled={isLoading}
                        >
                          편집하기
                        </Button>
                        <Button
                          onClick={handleNextFromPreview}
                          disabled={isLoading}
                        >
                          다음
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: 완료 */}
          {step === 'completion' && (
            <div className="space-y-4 pb-6">
              <div className="text-center py-6">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-semibold mb-2">
                  모든 문서가 생성되었습니다!
                </h3>

                <div className="mt-4 text-left bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium mb-2">생성된 문서:</p>
                  <ul className="space-y-1">
                    {documentTypeOrder.map(docType => (
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
                <Button
                  variant="outline"
                  onClick={handleGoBackFromCompletion}
                  disabled={isLoading}
                >
                  이전
                </Button>
                {readOnly && (
                  <Button variant="outline" onClick={handleClose}>
                    취소
                  </Button>
                )}
                <Button onClick={handleFinish}>확인</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
