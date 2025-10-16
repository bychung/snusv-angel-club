'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  AssemblyDocumentType,
  AssemblyWithCounts,
} from '@/types/assemblies';
import {
  ASSEMBLY_STATUS_NAMES,
  ASSEMBLY_TYPE_NAMES,
  DOCUMENT_TYPE_NAMES,
} from '@/types/assemblies';
import { FileText, Mail, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface AssemblyCardProps {
  assembly: AssemblyWithCounts;
  onContinue: (assemblyId: string) => void;
  onViewDocuments: (assemblyId: string) => void;
  onSendEmail: (assemblyId: string) => void;
  onDelete: (assemblyId: string) => void;
}

export default function AssemblyCard({
  assembly,
  onContinue,
  onViewDocuments,
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
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {ASSEMBLY_TYPE_NAMES[assembly.type]}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {formatDate(assembly.assembly_date)}
            </p>
          </div>
          <Badge className={getStatusBadgeColor(assembly.status)}>
            {ASSEMBLY_STATUS_NAMES[assembly.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700">
              생성된 문서: {assembly.document_count}/
              {assembly.total_document_count}
            </p>
            {assembly.documents && assembly.documents.length > 0 && (
              <ul className="mt-2 space-y-1">
                {assembly.documents.map(doc => (
                  <li
                    key={doc.id}
                    className="text-sm text-gray-600 flex items-center"
                  >
                    <span className="mr-2">✓</span>
                    {DOCUMENT_TYPE_NAMES[doc.type as AssemblyDocumentType]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {assembly.status === 'draft' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onContinue(assembly.id)}
              >
                계속 작성
              </Button>
            )}

            {assembly.document_count > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewDocuments(assembly.id)}
              >
                <FileText className="w-4 h-4 mr-1" />
                문서 보기
              </Button>
            )}

            {assembly.status === 'completed' && (
              <Button size="sm" onClick={() => onSendEmail(assembly.id)}>
                <Mail className="w-4 h-4 mr-1" />
                이메일 발송
              </Button>
            )}

            {assembly.status === 'sent' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSendEmail(assembly.id)}
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
