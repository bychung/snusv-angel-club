'use client';

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface TemplateSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
}

export function TemplateSearchBar({
  searchQuery,
  onSearchChange,
  resultCount,
}: TemplateSearchBarProps) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="내용 검색... (예: 관리보수)"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {searchQuery && resultCount !== undefined && (
        <div className="text-sm text-gray-600 whitespace-nowrap">
          {resultCount}개 결과
        </div>
      )}
    </div>
  );
}
