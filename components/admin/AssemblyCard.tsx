'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AssemblyWithCounts } from '@/types/assemblies';
import { ASSEMBLY_STATUS_NAMES, ASSEMBLY_TYPE_NAMES } from '@/types/assemblies';
import { FileText, Mail, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface AssemblyCardProps {
  assembly: AssemblyWithCounts;
  onContinue: (assemblyId: string) => void;
  onSendEmail: (assemblyId: string) => void;
  onDelete: (assemblyId: string) => void;
}

export default function AssemblyCard({
  assembly,
  onContinue,
  onSendEmail,
  onDelete,
}: AssemblyCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('정말 이 총회를 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(assembly.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
      2,
      '0'
    )}.${String(date.getDate()).padStart(2, '0')}`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="py-0">
        <div className="flex items-center justify-between gap-4">
          {/* 왼쪽: 총회 정보 */}
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">
                {ASSEMBLY_TYPE_NAMES[assembly.type]}
              </span>
              <span className="text-sm text-gray-500">
                ({formatDate(assembly.assembly_date)})
              </span>
            </div>

            <div className="text-sm text-gray-700">
              생성된 문서: {assembly.document_count}/
              {assembly.total_document_count}
            </div>

            <Badge className={getStatusBadgeColor(assembly.status)}>
              {ASSEMBLY_STATUS_NAMES[assembly.status]}
            </Badge>
          </div>

          {/* 오른쪽: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {(assembly.status === 'draft' ||
              assembly.status === 'completed' ||
              assembly.status === 'sent') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onContinue(assembly.id)}
                className="transition-all hover:scale-105 hover:shadow-md hover:bg-gray-100/70"
              >
                {assembly.status === 'draft' ? (
                  <>
                    <Pencil className="w-4 h-4 mr-1" />
                    계속 작성
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1" />
                    문서 보기
                  </>
                )}
              </Button>
            )}

            {assembly.status === 'completed' && (
              <Button
                size="sm"
                onClick={() => onSendEmail(assembly.id)}
                className="transition-all hover:scale-105 hover:shadow-md hover:bg-primary/70"
              >
                <Mail className="w-4 h-4 mr-1" />
                이메일 발송
              </Button>
            )}

            {assembly.status === 'sent' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSendEmail(assembly.id)}
                className="transition-all hover:scale-105 hover:shadow-md hover:bg-gray-100/70"
              >
                <Mail className="w-4 h-4 mr-1" />
                재발송
              </Button>
            )}

            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="transition-all hover:scale-105 hover:shadow-md hover:bg-destructive/70"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              삭제
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
