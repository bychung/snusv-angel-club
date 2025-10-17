'use client';

import type { AssemblyWithCounts } from '@/types/assemblies';
import AssemblyCard from './AssemblyCard';

interface AssemblyListProps {
  assemblies: AssemblyWithCounts[];
  onContinue: (assemblyId: string) => void;
  onSendEmail: (assemblyId: string) => void;
  onDelete: (assemblyId: string) => void;
}

export default function AssemblyList({
  assemblies,
  onContinue,
  onSendEmail,
  onDelete,
}: AssemblyListProps) {
  if (assemblies.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-600 mb-2">
          총회를 생성하여 관련 문서를 작성하고
        </p>
        <p className="text-gray-600">조합원들에게 발송할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assemblies.map(assembly => (
        <AssemblyCard
          key={assembly.id}
          assembly={assembly}
          onContinue={onContinue}
          onSendEmail={onSendEmail}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
