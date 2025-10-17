'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { AssemblyWithCounts } from '@/types/assemblies';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import AssemblyCreationModal from './AssemblyCreationModal';
import AssemblyDocumentGenerationModal from './AssemblyDocumentGenerationModal';
import AssemblyEmailModal from './AssemblyEmailModal';
import AssemblyList from './AssemblyList';

interface AssemblyManagementProps {
  fundId: string;
}

export default function AssemblyManagement({
  fundId,
}: AssemblyManagementProps) {
  const [assemblies, setAssemblies] = useState<AssemblyWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 총회 생성 모달
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);

  // 문서 생성 모달
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentGenerationAssemblyId, setDocumentGenerationAssemblyId] =
    useState<string | null>(null);
  const [isDocumentModalReadOnly, setIsDocumentModalReadOnly] = useState(false);

  // 이메일 발송 모달
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(
    null
  );

  useEffect(() => {
    loadAssemblies();
  }, [fundId]);

  const loadAssemblies = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/funds/${fundId}/assemblies`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '총회 목록 조회에 실패했습니다.');
      }

      const data = await response.json();
      setAssemblies(data.assemblies || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssembly = () => {
    setIsCreationModalOpen(true);
  };

  const handleAssemblyCreated = (assemblyId: string) => {
    setIsCreationModalOpen(false);
    // 즉시 문서 생성 모달 오픈
    setDocumentGenerationAssemblyId(assemblyId);
    setIsDocumentModalReadOnly(false);
    setIsDocumentModalOpen(true);
  };

  const handleContinue = (assemblyId: string) => {
    // 총회 상태 확인하여 읽기 전용 모드 결정
    const assembly = assemblies.find(a => a.id === assemblyId);
    const isReadOnly = assembly?.status === 'sent';

    // 문서 생성 모달 오픈
    setDocumentGenerationAssemblyId(assemblyId);
    setIsDocumentModalReadOnly(isReadOnly);
    setIsDocumentModalOpen(true);
  };

  const handleSendEmail = (assemblyId: string) => {
    setSelectedAssemblyId(assemblyId);
    setIsEmailModalOpen(true);
  };

  const handleDelete = async (assemblyId: string) => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '총회 삭제에 실패했습니다.');
      }

      // 목록 새로고침
      await loadAssemblies();
    } catch (err) {
      alert(err instanceof Error ? err.message : '총회 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">조합원 총회 관리</h2>
        <Button onClick={handleCreateAssembly}>
          <Plus className="w-4 h-4 mr-2" />
          총회 생성하기
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <AssemblyList
          assemblies={assemblies}
          onContinue={handleContinue}
          onSendEmail={handleSendEmail}
          onDelete={handleDelete}
        />
      )}

      {/* 총회 생성 모달 */}
      <AssemblyCreationModal
        fundId={fundId}
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onSuccess={handleAssemblyCreated} // assemblyId 받음
      />

      {/* 문서 생성 모달 */}
      {documentGenerationAssemblyId && (
        <AssemblyDocumentGenerationModal
          fundId={fundId}
          assemblyId={documentGenerationAssemblyId}
          isOpen={isDocumentModalOpen}
          onClose={() => {
            setIsDocumentModalOpen(false);
            setDocumentGenerationAssemblyId(null);
            setIsDocumentModalReadOnly(false);
          }}
          onSuccess={() => {
            setIsDocumentModalOpen(false);
            setDocumentGenerationAssemblyId(null);
            setIsDocumentModalReadOnly(false);
            loadAssemblies(); // 목록 새로고침
          }}
          readOnly={isDocumentModalReadOnly}
        />
      )}

      {/* 이메일 발송 모달 */}
      {selectedAssemblyId && (
        <AssemblyEmailModal
          fundId={fundId}
          assemblyId={selectedAssemblyId}
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedAssemblyId(null);
          }}
          onSuccess={() => {
            setIsEmailModalOpen(false);
            setSelectedAssemblyId(null);
            loadAssemblies();
          }}
        />
      )}
    </div>
  );
}
