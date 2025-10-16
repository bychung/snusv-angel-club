'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { AssemblyWithCounts } from '@/types/assemblies';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import AssemblyCreationModal from './AssemblyCreationModal';
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

  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
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

  const handleContinue = (assemblyId: string) => {
    // 계속 작성 - 생성 모달 재사용 (TODO: 개선 필요)
    alert('계속 작성 기능은 추후 구현 예정입니다.');
  };

  const handleViewDocuments = async (assemblyId: string) => {
    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}`
      );

      if (!response.ok) {
        throw new Error('총회 정보 조회에 실패했습니다.');
      }

      const data = await response.json();
      const assembly = data.assembly;

      if (!assembly.documents || assembly.documents.length === 0) {
        alert('생성된 문서가 없습니다.');
        return;
      }

      // 첫 번째 문서 미리보기
      const firstDoc = assembly.documents[0];
      const previewUrl = `/api/admin/funds/${fundId}/assemblies/${assemblyId}/documents/${firstDoc.id}/preview`;
      window.open(previewUrl, '_blank');
    } catch (err) {
      alert(err instanceof Error ? err.message : '문서 조회에 실패했습니다.');
    }
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
          onViewDocuments={handleViewDocuments}
          onSendEmail={handleSendEmail}
          onDelete={handleDelete}
        />
      )}

      {/* 총회 생성 모달 */}
      <AssemblyCreationModal
        fundId={fundId}
        isOpen={isCreationModalOpen}
        onClose={() => setIsCreationModalOpen(false)}
        onSuccess={() => {
          setIsCreationModalOpen(false);
          loadAssemblies();
        }}
      />

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
