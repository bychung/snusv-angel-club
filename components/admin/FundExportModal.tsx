'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';
import FundExportControls from './FundExportControls';

interface FundExportModalProps {
  fundId: string;
  fundName: string;
}

export default function FundExportModal({
  fundId,
  fundName,
}: FundExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Download className="h-4 w-4 mr-1" />
          데이터 내보내기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {fundName} 데이터 내보내기
          </DialogTitle>
          <DialogDescription>
            조합원 데이터를 Excel 또는 CSV 형식으로 내보낼 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <FundExportControls fundId={fundId} fundName={fundName} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
