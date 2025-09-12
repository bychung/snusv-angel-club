'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface SignupInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  attemptedEmail: string;
  searchedEmail?: string;
  provider: string;
}

export default function SignupInquiryModal({
  isOpen,
  onClose,
  onSubmit,
  attemptedEmail,
  searchedEmail,
  provider,
}: SignupInquiryModalProps) {
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string>('');

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError('');

    try {
      // sessionStorage에서 임시 토큰 가져오기
      const tempToken = sessionStorage.getItem('temp_auth_token');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (tempToken) {
        headers['Authorization'] = `Bearer ${tempToken}`;
      }

      const response = await fetch('/api/inquiries/signup', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          attemptedEmail,
          searchedEmail: searchedEmail || null,
          provider,
          inquiryMessage: inquiryMessage.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '문의 제출 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      console.log('문의 제출 성공:', result);

      setIsSubmitted(true);

      // 3초 후 모달 닫기 및 콜백 호출
      setTimeout(() => {
        // 임시 토큰 정리
        sessionStorage.removeItem('temp_auth_token');
        onSubmit();
        onClose();
        setIsSubmitted(false);
        setInquiryMessage('');
        router.replace('/');
      }, 5000);
    } catch (error) {
      console.error('문의 제출 오류:', error);
      setError(error instanceof Error ? error.message : '문의 제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting || isSubmitted) return;

    onClose();
    setInquiryMessage('');
    setError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            회원가입 문의
          </DialogTitle>
          {!isSubmitted && (
            <DialogDescription>
              등록된 이메일을 찾을 수 없습니다. 관리자에게 문의를 남겨주시면 확인 후
              처리해드리겠습니다.
            </DialogDescription>
          )}
        </DialogHeader>

        {isSubmitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">문의가 접수되었습니다!</h3>
              <p className="text-sm text-gray-600">
                관리자가 확인 후 처리해드리겠습니다.
                <br />
                잠시 후 창이 자동으로 닫힙니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 시도한 이메일 정보 */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-1">
              <div>
                <span className="text-sm font-medium text-blue-700">로그인 시도 이메일:</span>
                <p className="text-blue-900">{attemptedEmail}</p>
              </div>

              {searchedEmail && (
                <div>
                  <span className="text-sm font-medium text-blue-700">검색한 이메일:</span>
                  <p className="text-blue-900">{searchedEmail}</p>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-blue-700">로그인 방식:</span>
                <p className="text-blue-900 capitalize">{provider}</p>
              </div>
            </div>

            {/* 문의 메시지 입력 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="inquiry-message"
                  className="text-sm font-medium text-gray-700 block mb-1"
                >
                  추가 문의사항 (선택사항)
                </label>
                <Textarea
                  id="inquiry-message"
                  value={inquiryMessage}
                  onChange={e => setInquiryMessage(e.target.value)}
                  placeholder="예: 회사 이메일이 변경되었습니다. 기존 등록 정보는 old@company.com이었습니다."
                  rows={4}
                  disabled={isSubmitting}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">{inquiryMessage.length}/1000자</p>
              </div>

              {/* 버튼들 */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      문의 제출
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
