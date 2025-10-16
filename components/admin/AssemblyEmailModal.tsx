'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EmailPreviewResponse } from '@/types/assemblies';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AssemblyEmailModalProps {
  fundId: string;
  assemblyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssemblyEmailModal({
  fundId,
  assemblyId,
  isOpen,
  onClose,
  onSuccess,
}: AssemblyEmailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);

  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set()
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      // 초기화
      setPreview(null);
      setSelectedRecipients(new Set());
      setSubject('');
      setBody('');
      setSelectedDocuments(new Set());
      setError(null);
    }
  }, [isOpen, assemblyId]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/email/preview`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '이메일 미리보기 조회에 실패했습니다.');
      }

      const data: EmailPreviewResponse = await response.json();
      setPreview(data);
      setSubject(data.subject);
      setBody(data.body);

      // 모든 수신자 선택
      setSelectedRecipients(new Set(data.recipients.map(r => r.id)));

      // 모든 문서 선택
      setSelectedDocuments(new Set(data.attachments.map(a => a.id)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecipient = (id: string) => {
    const newSet = new Set(selectedRecipients);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRecipients(newSet);
  };

  const handleToggleAllRecipients = () => {
    if (!preview) return;

    if (selectedRecipients.size === preview.recipients.length) {
      // 전체 해제
      setSelectedRecipients(new Set());
    } else {
      // 전체 선택
      setSelectedRecipients(new Set(preview.recipients.map(r => r.id)));
    }
  };

  const handleToggleDocument = (id: string) => {
    const newSet = new Set(selectedDocuments);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocuments(newSet);
  };

  const handleSend = async () => {
    if (selectedRecipients.size === 0) {
      setError('수신자를 선택해주세요.');
      return;
    }

    if (selectedDocuments.size === 0) {
      setError('첨부할 문서를 선택해주세요.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('제목과 본문을 입력해주세요.');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/email/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_ids: Array.from(selectedRecipients),
            subject,
            body,
            document_ids: Array.from(selectedDocuments),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '이메일 발송에 실패했습니다.');
      }

      alert('이메일 발송이 시작되었습니다.');
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>총회 문서 이메일 발송</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* 수신자 선택 */}
            <div>
              <Label>수신자: {selectedRecipients.size}명의 조합원</Label>
              <div className="mt-2 border rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="flex items-center mb-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={
                      selectedRecipients.size === preview.recipients.length &&
                      preview.recipients.length > 0
                    }
                    onCheckedChange={handleToggleAllRecipients}
                  />
                  <label
                    htmlFor="select-all"
                    className="ml-2 text-sm font-medium cursor-pointer"
                  >
                    전체 선택
                  </label>
                </div>
                {preview.recipients.map(recipient => (
                  <div key={recipient.id} className="flex items-center py-1">
                    <Checkbox
                      id={`recipient-${recipient.id}`}
                      checked={selectedRecipients.has(recipient.id)}
                      onCheckedChange={() =>
                        handleToggleRecipient(recipient.id)
                      }
                    />
                    <label
                      htmlFor={`recipient-${recipient.id}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {recipient.name} ({recipient.email})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* 발송 내용 */}
            <div>
              <Label htmlFor="email-subject">제목</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email-body">본문</Label>
              <Textarea
                id="email-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={10}
                className="mt-1"
              />
            </div>

            {/* 첨부 문서 */}
            <div>
              <Label>첨부 문서</Label>
              <div className="mt-2 space-y-2">
                {preview.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center">
                    <Checkbox
                      id={`doc-${attachment.id}`}
                      checked={selectedDocuments.has(attachment.id)}
                      onCheckedChange={() =>
                        handleToggleDocument(attachment.id)
                      }
                    />
                    <label
                      htmlFor={`doc-${attachment.id}`}
                      className="ml-2 text-sm cursor-pointer"
                    >
                      {attachment.file_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isSending}>
                취소
              </Button>
              <Button onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  '발송'
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
