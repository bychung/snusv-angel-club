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
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AssemblyEmailModalProps {
  fundId: string;
  assemblyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RequiredDocumentsStatus {
  account: boolean;
  tax: boolean;
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
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocumentsStatus>({
    account: false,
    tax: false,
  });

  const [selectedRecipients, setSelectedRecipients] = useState<{
    to: Set<string>;
    cc: Set<string>;
    bcc: Set<string>;
  }>({
    to: new Set(),
    cc: new Set(),
    bcc: new Set(),
  });
  const [recipientType, setRecipientType] = useState<'to' | 'cc' | 'bcc'>(
    'bcc'
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // 공통 첨부 파일 선택
  const [includeFormationAgenda, setIncludeFormationAgenda] = useState(true);
  const [includeLpa, setIncludeLpa] = useState(true);

  // 개인별 첨부 파일 선택
  const [includeFormationConsentForm, setIncludeFormationConsentForm] =
    useState(true);
  const [includeLpaConsentForm, setIncludeLpaConsentForm] = useState(true);
  const [includePersonalInfoConsentForm, setIncludePersonalInfoConsentForm] =
    useState(true);

  // 최종 확인 단계
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
      checkRequiredDocuments();
    } else {
      // 초기화
      setPreview(null);
      setSelectedRecipients({
        to: new Set(),
        cc: new Set(),
        bcc: new Set(),
      });
      setRecipientType('bcc');
      setSubject('');
      setBody('');
      setIncludeFormationAgenda(true);
      setIncludeLpa(true);
      setIncludeFormationConsentForm(true);
      setIncludeLpaConsentForm(true);
      setIncludePersonalInfoConsentForm(true);
      setShowConfirmation(false);
      setError(null);
    }
  }, [isOpen, assemblyId, fundId]);

  const checkRequiredDocuments = async () => {
    try {
      // 계좌 사본 체크
      const accountResponse = await fetch(
        `/api/admin/funds/${fundId}/documents/account`
      );
      const accountData = await accountResponse.json();
      const hasAccount =
        accountResponse.ok && accountData.documents?.length > 0;

      // 고유번호증 체크
      const taxResponse = await fetch(
        `/api/admin/funds/${fundId}/documents/tax`
      );
      const taxData = await taxResponse.json();
      const hasTax = taxResponse.ok && taxData.documents?.length > 0;

      setRequiredDocs({
        account: hasAccount,
        tax: hasTax,
      });

      if (!hasAccount || !hasTax) {
        const missing = [];
        if (!hasAccount) missing.push('계좌 사본');
        if (!hasTax) missing.push('고유번호증');
        setError(
          `필수 문서가 누락되었습니다: ${missing.join(
            ', '
          )}. 펀드 공통 문서에서 먼저 업로드해주세요.`
        );
      }
    } catch (err) {
      console.error('필수 문서 체크 실패:', err);
    }
  };

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

      // 기본적으로 BCC에 모든 수신자 선택
      setSelectedRecipients({
        to: new Set(),
        cc: new Set(),
        bcc: new Set(data.recipients.map(r => r.id)),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 선택된 유형의 수신자 목록
  const currentRecipients = selectedRecipients[recipientType];

  // 전체 수신자 수 계산
  const totalSelectedCount =
    selectedRecipients.to.size +
    selectedRecipients.cc.size +
    selectedRecipients.bcc.size;

  const handleToggleRecipient = (id: string) => {
    const newSelected = { ...selectedRecipients };

    if (currentRecipients.has(id)) {
      // 현재 유형에서 해제
      newSelected[recipientType].delete(id);
    } else {
      // 다른 유형에서 제거하고 현재 유형에 추가
      (['to', 'cc', 'bcc'] as const).forEach(type => {
        if (type !== recipientType) {
          newSelected[type].delete(id);
        }
      });
      newSelected[recipientType].add(id);
    }

    setSelectedRecipients(newSelected);
  };

  const handleToggleAllRecipients = () => {
    if (!preview) return;

    if (currentRecipients.size === preview.recipients.length) {
      // 현재 유형 전체 해제
      setSelectedRecipients(prev => ({
        ...prev,
        [recipientType]: new Set(),
      }));
    } else {
      // 현재 유형 전체 선택 (다른 유형에서 제거)
      const newSelected = { ...selectedRecipients };
      const allIds = new Set(preview.recipients.map(r => r.id));

      // 다른 유형에서 이 조합원들 제거
      (['to', 'cc', 'bcc'] as const).forEach(type => {
        if (type !== recipientType) {
          allIds.forEach(id => newSelected[type].delete(id));
        }
      });

      newSelected[recipientType] = allIds;
      setSelectedRecipients(newSelected);
    }
  };

  const handleSendClick = () => {
    if (totalSelectedCount === 0) {
      setError('수신자를 선택해주세요.');
      return;
    }

    if (!requiredDocs.account || !requiredDocs.tax) {
      setError(
        '필수 문서가 누락되었습니다. 계좌 사본과 고유번호증을 먼저 업로드해주세요.'
      );
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('제목과 본문을 입력해주세요.');
      return;
    }

    // 확인 단계로 이동
    setError(null);
    setShowConfirmation(true);
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      // formation_agenda 문서 ID 찾기
      const formationAgendaDoc = preview?.attachments.find(
        att => att.file_name === '결성총회 의안.pdf'
      );

      const response = await fetch(
        `/api/admin/funds/${fundId}/assemblies/${assemblyId}/email/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_ids: Array.from(selectedRecipients.to),
            cc_ids: Array.from(selectedRecipients.cc),
            bcc_ids: Array.from(selectedRecipients.bcc),
            subject,
            body,
            documents: {
              common: {
                formation_agenda: includeFormationAgenda
                  ? formationAgendaDoc?.id
                  : null,
                lpa: includeLpa,
              },
              individual: {
                formation_consent_form: includeFormationConsentForm,
                lpa_consent_form: includeLpaConsentForm,
                personal_info_consent_form: includePersonalInfoConsentForm,
              },
            },
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
          showConfirmation ? (
            // 최종 확인 단계
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold text-lg mb-4">
                  📧 발송 전 최종 확인
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  아래 내용을 확인하고 이메일을 발송하시겠습니까?
                </p>

                {/* 수신자 목록 */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">수신자 목록</h4>
                  <div className="space-y-2 bg-white rounded p-3">
                    {selectedRecipients.to.size > 0 && (
                      <div>
                        <div className="font-medium text-sm text-gray-700 mb-1">
                          수신자 (To): {selectedRecipients.to.size}명
                        </div>
                        <div className="text-xs text-gray-600 ml-2 space-y-0.5">
                          {preview.recipients
                            .filter(r => selectedRecipients.to.has(r.id))
                            .map(r => (
                              <div key={r.id}>
                                • {r.name} ({r.email})
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {selectedRecipients.cc.size > 0 && (
                      <div>
                        <div className="font-medium text-sm text-gray-700 mb-1">
                          참조 (CC): {selectedRecipients.cc.size}명
                        </div>
                        <div className="text-xs text-gray-600 ml-2 space-y-0.5">
                          {preview.recipients
                            .filter(r => selectedRecipients.cc.has(r.id))
                            .map(r => (
                              <div key={r.id}>
                                • {r.name} ({r.email})
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {selectedRecipients.bcc.size > 0 && (
                      <div>
                        <div className="font-medium text-sm text-gray-700 mb-1">
                          숨은 참조 (BCC): {selectedRecipients.bcc.size}명
                        </div>
                        <div className="text-xs text-gray-600 ml-2 space-y-0.5">
                          {preview.recipients
                            .filter(r => selectedRecipients.bcc.has(r.id))
                            .map(r => (
                              <div key={r.id}>
                                • {r.name} ({r.email})
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 이메일 제목 */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">제목</h4>
                  <div className="bg-white rounded p-3 text-sm">{subject}</div>
                </div>

                {/* 첨부 파일 목록 */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">첨부 파일</h4>
                  <div className="bg-white rounded p-3 space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      공통 첨부 파일:
                    </div>
                    <div className="text-xs text-gray-600 ml-2 space-y-0.5">
                      <div>• 계좌 사본 (자동 첨부)</div>
                      <div>• 고유번호증 (자동 첨부)</div>
                      {includeFormationAgenda && <div>• 결성총회 의안</div>}
                      {includeLpa && <div>• 규약 (LPA)</div>}
                    </div>
                    <div className="text-sm font-medium text-gray-700 mt-3">
                      개인별 첨부 파일:
                    </div>
                    <div className="text-xs text-gray-600 ml-2 space-y-0.5">
                      {includeFormationConsentForm && (
                        <div>• 결성총회 의안 동의서 (각 수신자별)</div>
                      )}
                      {includeLpaConsentForm && (
                        <div>• 규약 동의서 (각 수신자별)</div>
                      )}
                      {includePersonalInfoConsentForm && (
                        <div>• 개인정보 동의서 (각 수신자별)</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 본문 미리보기 */}
                <div>
                  <h4 className="font-medium mb-2">본문 미리보기</h4>
                  <div className="bg-white rounded p-3 text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {body}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSending}
                >
                  이전
                </Button>
                <Button onClick={handleConfirmSend} disabled={isSending}>
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      발송 중...
                    </>
                  ) : (
                    '발송 확인'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // 편집 단계
            <div className="space-y-4">
              {/* 수신자 유형 선택 */}
              <div className="space-y-2">
                <Label>수신자 유형 선택</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="to"
                      checked={recipientType === 'to'}
                      onChange={e =>
                        setRecipientType(e.target.value as 'to' | 'cc' | 'bcc')
                      }
                      disabled={isSending}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      수신자 (To){' '}
                      {selectedRecipients.to.size > 0 &&
                        `(${selectedRecipients.to.size}명)`}
                    </span>
                    <span
                      className="text-xs text-gray-500"
                      title="모든 수신자에게 이메일 주소가 공개됩니다"
                    >
                      ℹ️
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="cc"
                      checked={recipientType === 'cc'}
                      onChange={e =>
                        setRecipientType(e.target.value as 'to' | 'cc' | 'bcc')
                      }
                      disabled={isSending}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      참조 (CC){' '}
                      {selectedRecipients.cc.size > 0 &&
                        `(${selectedRecipients.cc.size}명)`}
                    </span>
                    <span
                      className="text-xs text-gray-500"
                      title="모든 수신자에게 이메일 주소가 공개됩니다"
                    >
                      ℹ️
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="bcc"
                      checked={recipientType === 'bcc'}
                      onChange={e =>
                        setRecipientType(e.target.value as 'to' | 'cc' | 'bcc')
                      }
                      disabled={isSending}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">
                      숨은 참조 (BCC){' '}
                      {selectedRecipients.bcc.size > 0 &&
                        `(${selectedRecipients.bcc.size}명)`}
                    </span>
                    <span
                      className="text-xs text-gray-500"
                      title="다른 수신자에게 이메일 주소가 공개되지 않습니다"
                    >
                      ℹ️
                    </span>
                  </label>
                </div>
                <div className="text-xs text-gray-500">
                  조합원을 선택하여 현재 유형에 추가하세요. 다른 유형에 이미
                  포함된 조합원은 자동으로 이동됩니다.
                </div>
              </div>

              {/* 수신자 선택 */}
              <div>
                <Label>
                  조합원 선택: 현재 유형 {currentRecipients.size}명 | 전체{' '}
                  {totalSelectedCount}명
                </Label>
                <div className="mt-2 border rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="flex items-center mb-2 pb-2 border-b">
                    <Checkbox
                      id="select-all"
                      checked={
                        currentRecipients.size === preview.recipients.length &&
                        preview.recipients.length > 0
                      }
                      onCheckedChange={handleToggleAllRecipients}
                    />
                    <label
                      htmlFor="select-all"
                      className="ml-2 text-sm font-medium cursor-pointer"
                    >
                      현재 유형에 전체 선택
                    </label>
                  </div>
                  {preview.recipients.map(recipient => {
                    const isInCurrentType = currentRecipients.has(recipient.id);
                    const isInOtherType =
                      selectedRecipients.to.has(recipient.id) ||
                      selectedRecipients.cc.has(recipient.id) ||
                      selectedRecipients.bcc.has(recipient.id);
                    const otherType =
                      isInOtherType && !isInCurrentType
                        ? selectedRecipients.to.has(recipient.id)
                          ? 'To'
                          : selectedRecipients.cc.has(recipient.id)
                          ? 'CC'
                          : 'BCC'
                        : null;

                    return (
                      <div
                        key={recipient.id}
                        className="flex items-center py-1"
                      >
                        <Checkbox
                          id={`recipient-${recipient.id}`}
                          checked={isInCurrentType || isInOtherType}
                          onCheckedChange={() =>
                            handleToggleRecipient(recipient.id)
                          }
                          className={otherType ? 'opacity-40' : ''}
                        />
                        <label
                          htmlFor={`recipient-${recipient.id}`}
                          className="ml-2 text-sm cursor-pointer"
                        >
                          {recipient.name} ({recipient.email})
                          {otherType && (
                            <span className="text-xs text-blue-600 ml-1">
                              [{otherType}]
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
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
              <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                <div>
                  <h3 className="font-semibold mb-2">
                    공통 첨부 파일 (모든 수신자)
                  </h3>
                  <div className="space-y-2">
                    {/* 필수 문서 안내 */}
                    <div className="flex items-center gap-2 text-sm">
                      {requiredDocs.account ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-red-600">✗</span>
                      )}
                      <span
                        className={
                          requiredDocs.account
                            ? 'text-gray-700'
                            : 'text-red-600 font-medium'
                        }
                      >
                        계좌 사본 (자동 첨부)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {requiredDocs.tax ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="h-4 w-4 text-red-600">✗</span>
                      )}
                      <span
                        className={
                          requiredDocs.tax
                            ? 'text-gray-700'
                            : 'text-red-600 font-medium'
                        }
                      >
                        고유번호증 (자동 첨부)
                      </span>
                    </div>

                    {/* 선택 가능한 공통 문서 */}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-formation-agenda"
                        checked={includeFormationAgenda}
                        onCheckedChange={checked =>
                          setIncludeFormationAgenda(checked === true)
                        }
                      />
                      <label
                        htmlFor="include-formation-agenda"
                        className="text-sm cursor-pointer"
                      >
                        결성총회 의안
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="include-lpa"
                        checked={includeLpa}
                        onCheckedChange={checked =>
                          setIncludeLpa(checked === true)
                        }
                      />
                      <label
                        htmlFor="include-lpa"
                        className="text-sm cursor-pointer"
                      >
                        규약 (LPA)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">개인별 첨부 파일</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="include-formation-consent-form"
                        checked={includeFormationConsentForm}
                        onCheckedChange={checked =>
                          setIncludeFormationConsentForm(checked === true)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="include-formation-consent-form"
                          className="text-sm cursor-pointer block"
                        >
                          결성총회 의안 동의서 (개인별)
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          각 수신자에게 자신의 동의서만 첨부됩니다
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="include-lpa-consent-form"
                        checked={includeLpaConsentForm}
                        onCheckedChange={checked =>
                          setIncludeLpaConsentForm(checked === true)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="include-lpa-consent-form"
                          className="text-sm cursor-pointer block"
                        >
                          규약 동의서 (개인별)
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          각 수신자에게 자신의 동의서만 첨부됩니다
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="include-personal-info-consent-form"
                        checked={includePersonalInfoConsentForm}
                        onCheckedChange={checked =>
                          setIncludePersonalInfoConsentForm(checked === true)
                        }
                      />
                      <div className="flex-1">
                        <label
                          htmlFor="include-personal-info-consent-form"
                          className="text-sm cursor-pointer block"
                        >
                          개인정보 동의서 (개인별)
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          각 수신자에게 자신의 동의서만 첨부됩니다
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSending}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSendClick}
                  disabled={
                    isSending || !requiredDocs.account || !requiredDocs.tax
                  }
                >
                  다음
                </Button>
              </div>
            </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
