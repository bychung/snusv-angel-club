'use client';

import { Badge } from '@/components/ui/badge';
import { extractVariableName } from '@/lib/admin/template-text-utils';
import { X } from 'lucide-react';

interface TemplateVariableBadgeProps {
  variable: string;
  onRemove?: () => void;
  readOnly?: boolean;
}

export function TemplateVariableBadge({
  variable,
  onRemove,
  readOnly = false,
}: TemplateVariableBadgeProps) {
  const variableName = extractVariableName(variable);

  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300"
    >
      <span className="font-semibold">{variableName}</span>
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:bg-purple-300 rounded-sm p-0.5 transition-colors"
          aria-label="변수 삭제"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
