'use client';

import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';

interface PersonalInfoConsentFormGenerateButtonProps {
  fundId: string;
  disabled?: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function PersonalInfoConsentFormGenerateButton({
  fundId,
  disabled,
  isGenerating,
  onGenerate,
}: PersonalInfoConsentFormGenerateButtonProps) {
  return (
    <Button
      onClick={onGenerate}
      disabled={disabled || isGenerating}
      className="w-full sm:w-auto"
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          생성 중...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          개인정보 동의서 생성
        </>
      )}
    </Button>
  );
}
