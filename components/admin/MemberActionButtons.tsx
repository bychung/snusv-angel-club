'use client';

import { Button } from '@/components/ui/button';
import { Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import AddMemberModal from './AddMemberModal';
import BulkUploadModal from './BulkUploadModal';

interface MemberActionButtonsProps {
  fundId: string;
  fundName: string;
}

export default function MemberActionButtons({ fundId, fundName }: MemberActionButtonsProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleUpdateSuccess = () => {
    // 페이지 새로고침으로 업데이트된 데이터 반영
    window.location.reload();
  };

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        일괄 업로드
      </Button>
      <Button onClick={() => setIsAddModalOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        조합원 추가
      </Button>

      {/* 조합원 추가 모달 */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        fundId={fundId}
        fundName={fundName}
        isAdding={isAdding}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleUpdateSuccess}
      />

      {/* 일괄 업로드 모달 */}
      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        fundId={fundId}
        fundName={fundName}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onUploadComplete={handleUpdateSuccess}
      />
    </div>
  );
}
