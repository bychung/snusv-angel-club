'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MemberWithFund } from '@/lib/admin/members';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

interface FundMemberEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundId: string;
  fundName: string;
  members: MemberWithFund[];
}

export default function FundMemberEmailModal({
  isOpen,
  onClose,
  fundId,
  fundName,
  members,
}: FundMemberEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 이메일이 있는 조합원만 필터링
  const validMembers = members.filter(member => member.email);

  // 검색 필터링
  const filteredMembers = validMembers.filter(
    member =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedRecipients.size === filteredMembers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(filteredMembers.map(member => member.id)));
    }
  };

  // 개별 선택/해제
  const handleToggleRecipient = (memberId: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedRecipients(newSelected);
  };

  // 폼 초기화
  const resetForm = () => {
    setSubject('');
    setBody('');
    setSelectedRecipients(new Set());
    setSearchTerm('');
  };

  // 발송 핸들러
  const handleSend = async () => {
    // 유효성 검증
    if (selectedRecipients.size === 0) {
      alert('수신자를 최소 1명 이상 선택해주세요.');
      return;
    }

    if (!subject.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!body.trim()) {
      alert('본문을 입력해주세요.');
      return;
    }

    // 확인 다이얼로그
    if (
      !confirm(
        `선택한 ${selectedRecipients.size}명에게 이메일을 발송하시겠습니까?`
      )
    ) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(
        `/api/admin/funds/${fundId}/members/email/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient_ids: Array.from(selectedRecipients),
            subject: subject.trim(),
            body: body.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이메일 발송에 실패했습니다.');
      }

      alert('이메일이 성공적으로 발송되었습니다.');
      resetForm();
      onClose();
    } catch (error) {
      console.error('이메일 발송 실패:', error);
      alert(
        error instanceof Error
          ? error.message
          : '이메일 발송에 실패했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>조합원 이메일 발송 - {fundName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 제목 입력 */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="이메일 제목을 입력하세요"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={isSending}
            />
          </div>

          {/* 수신자 선택 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                수신자 선택 <span className="text-red-500">*</span>
              </Label>
              <div className="text-sm text-gray-600">
                총 {validMembers.length}명 중 {selectedRecipients.size}명 선택됨
              </div>
            </div>

            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="이름 또는 이메일로 검색"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={isSending}
              />
            </div>

            {/* 수신자 목록 */}
            <div className="border rounded-lg">
              {/* 전체 선택 */}
              <div className="sticky top-0 bg-gray-50 border-b p-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filteredMembers.length > 0 &&
                      selectedRecipients.size === filteredMembers.length
                    }
                    onChange={handleSelectAll}
                    disabled={isSending || filteredMembers.length === 0}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-sm">전체 선택</span>
                </label>
              </div>

              {/* 조합원 목록 */}
              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {validMembers.length === 0
                    ? '이메일이 등록된 조합원이 없습니다.'
                    : '검색 결과가 없습니다.'}
                </div>
              ) : (
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                    {filteredMembers.map(member => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 py-1 px-1 hover:bg-gray-50 cursor-pointer rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(member.id)}
                          onChange={() => handleToggleRecipient(member.id)}
                          disabled={isSending}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-sm truncate">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-gray-600 ml-1.5">
                            ({member.email})
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 본문 입력 */}
          <div className="space-y-2">
            <Label htmlFor="body">
              본문 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="body"
              placeholder="이메일 본문을 입력하세요"
              value={body}
              onChange={e => setBody(e.target.value)}
              disabled={isSending}
              rows={10}
              className="min-h-[200px]"
            />
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSending}
            >
              취소
            </Button>
            <Button onClick={handleSend} disabled={isSending}>
              {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              발송
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
