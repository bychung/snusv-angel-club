'use client';

import { useSurveyStore } from '@/store/surveyStore';

export default function SurveyProgress() {
  const store = useSurveyStore();
  const currentPage = store.getCurrentPage();
  const surveyData = store.getCurrentSurveyData();

  // 실제 진행률 계산 (조건부 페이지 고려)
  const calculateProgress = () => {
    if (currentPage === 9) return 100;

    let totalPages = 8;
    let actualPage = currentPage;

    // 6페이지 이후는 조건부이므로 진행률 조정
    if (currentPage === 7 || currentPage === 8) {
      actualPage = 7; // 7,8은 같은 단계로 취급
    }

    return Math.round((actualPage / totalPages) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="w-full mb-8">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 text-sm text-gray-600 text-center">
        {currentPage === 9 ? '제출 완료' : `진행률 ${progress}%`}
      </div>
    </div>
  );
}
