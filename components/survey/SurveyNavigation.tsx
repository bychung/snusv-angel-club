'use client';

import { Button } from '@/components/ui/button';
import { useSurveyStore } from '@/store/surveyStore';
import { ArrowLeft } from 'lucide-react';

export default function SurveyNavigation() {
  const { currentPage, prevPage } = useSurveyStore();

  return (
    <div className="flex justify-between items-center mb-6">
      <div className="w-24">
        {currentPage > 1 && currentPage < 9 && (
          <Button
            variant="ghost"
            onClick={prevPage}
            className="flex items-center gap-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">뒤로</span>
          </Button>
        )}
      </div>

      <div className="flex-1 text-center">
        {currentPage < 9 && (
          <div className="inline-flex items-center gap-2">
            <span className="text-sm text-gray-500">{currentPage} / 8</span>
          </div>
        )}
      </div>

      <div className="w-24">{/* 오른쪽 공간 확보용 */}</div>
    </div>
  );
}
