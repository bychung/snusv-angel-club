'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building,
  Calendar,
  Download,
  ExternalLink,
  Mail,
  MessageSquare,
  RefreshCw,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface StartupInquiry {
  id: string;
  company_name: string;
  contact_person: string;
  position: string;
  company_description: string;
  ir_deck_url: string | null;
  created_at: string;
}

interface AngelInquiry {
  id: string;
  name: string;
  self_introduction: string;
  email: string;
  created_at: string;
}

interface SignupInquiry {
  id: string;
  user_id: string | null;
  attempted_email: string;
  searched_email: string | null;
  provider: string;
  inquiry_message: string | null;
  status: 'pending' | 'processed' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function InquiriesPage() {
  const [activeTab, setActiveTab] = useState<'startup' | 'angel' | 'signup'>(
    'startup'
  );
  const [startupInquiries, setStartupInquiries] = useState<StartupInquiry[]>(
    []
  );
  const [angelInquiries, setAngelInquiries] = useState<AngelInquiry[]>([]);
  const [signupInquiries, setSignupInquiries] = useState<SignupInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStartup, setSelectedStartup] = useState<StartupInquiry | null>(
    null
  );
  const [selectedAngel, setSelectedAngel] = useState<AngelInquiry | null>(null);
  const [selectedSignup, setSelectedSignup] = useState<SignupInquiry | null>(
    null
  );

  const fetchInquiries = async () => {
    setIsLoading(true);
    try {
      const [startupResponse, angelResponse, signupResponse] =
        await Promise.all([
          fetch('/api/inquiries/startup'),
          fetch('/api/inquiries/angel'),
          fetch('/api/inquiries/signup'),
        ]);

      if (startupResponse.ok) {
        const startupData = await startupResponse.json();
        setStartupInquiries(startupData.data || []);
      }

      if (angelResponse.ok) {
        const angelData = await angelResponse.json();
        setAngelInquiries(angelData.data || []);
      }

      if (signupResponse.ok) {
        const signupData = await signupResponse.json();
        setSignupInquiries(signupData.data || []);
      }
    } catch (error) {
      console.error('문의 목록 조회 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownloadIRDeck = async (
    inquiryId: string,
    companyName: string
  ) => {
    try {
      const response = await fetch(
        `/api/inquiries/startup/${inquiryId}/download`
      );

      if (!response.ok) {
        const errorData = await response.json();
        alert(`다운로드 실패: ${errorData.error}`);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${companyName}_IR_Deck.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">문의 관리</h1>
            <p className="mt-2 text-gray-600">
              스타트업 IR, 엔젤클럽 가입 및 회원가입 문의 관리
            </p>
          </div>
          <Button onClick={fetchInquiries} disabled={isLoading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            새로고침
          </Button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                스타트업 IR 문의
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {startupInquiries.length}
              </div>
              <p className="text-xs text-muted-foreground">총 문의 수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                엔젤클럽 가입 문의
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{angelInquiries.length}</div>
              <p className="text-xs text-muted-foreground">총 문의 수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                회원가입 문의
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signupInquiries.length}</div>
              <p className="text-xs text-muted-foreground">
                미처리:{' '}
                {signupInquiries.filter(i => i.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 탭 버튼 */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('startup')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'startup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Building className="w-4 h-4 inline mr-2" />
            스타트업 IR 문의
          </button>
          <button
            onClick={() => setActiveTab('angel')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'angel'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            엔젤클럽 가입 문의
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'signup'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            회원가입 문의
          </button>
        </div>

        {/* 스타트업 IR 문의 목록 */}
        {activeTab === 'startup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                스타트업 IR 문의
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : startupInquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {startupInquiries.map(inquiry => (
                    <div
                      key={inquiry.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedStartup(inquiry)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">
                          {inquiry.company_name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDate(inquiry.created_at)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          담당자: {inquiry.contact_person} ({inquiry.position})
                        </div>
                        <div className="flex items-center gap-1">
                          {inquiry.ir_deck_url && (
                            <>
                              <ExternalLink className="w-3 h-3" />
                              IR 덱 첨부됨
                            </>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                        {inquiry.company_description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 엔젤클럽 가입 문의 목록 */}
        {activeTab === 'angel' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                엔젤클럽 가입 문의
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : angelInquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {angelInquiries.map(inquiry => (
                    <div
                      key={inquiry.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAngel(inquiry)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">
                          {inquiry.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDate(inquiry.created_at)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Mail className="w-3 h-3" />
                        {inquiry.email}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {inquiry.self_introduction}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 회원가입 문의 목록 */}
        {activeTab === 'signup' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                회원가입 문의
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">로딩 중...</div>
              ) : signupInquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  문의가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {signupInquiries.map(inquiry => (
                    <div
                      key={inquiry.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedSignup(inquiry)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {inquiry.attempted_email}
                          </h3>
                          <Badge
                            variant={
                              inquiry.status === 'pending'
                                ? 'destructive'
                                : inquiry.status === 'processed'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {inquiry.status === 'pending'
                              ? '미처리'
                              : inquiry.status === 'processed'
                                ? '처리중'
                                : '완료'}
                          </Badge>
                        </div>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          {formatDate(inquiry.created_at)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>로그인 방식: {inquiry.provider}</div>
                        {inquiry.searched_email && (
                          <div>검색한 이메일: {inquiry.searched_email}</div>
                        )}
                      </div>
                      {inquiry.inquiry_message && (
                        <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                          {inquiry.inquiry_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 스타트업 상세 모달 */}
        <Dialog
          open={!!selectedStartup}
          onOpenChange={() => setSelectedStartup(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                {selectedStartup?.company_name} IR 문의
              </DialogTitle>
            </DialogHeader>
            {selectedStartup && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      회사명
                    </label>
                    <p className="mt-1">{selectedStartup.company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      담당자
                    </label>
                    <p className="mt-1">{selectedStartup.contact_person}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      직위
                    </label>
                    <p className="mt-1">{selectedStartup.position}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      문의 일시
                    </label>
                    <p className="mt-1">
                      {formatDate(selectedStartup.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    회사 소개
                  </label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedStartup.company_description}
                  </p>
                </div>

                {selectedStartup.ir_deck_url && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        handleDownloadIRDeck(
                          selectedStartup.id,
                          selectedStartup.company_name
                        )
                      }
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      IR 덱 다운로드
                    </Button>
                    <a
                      href={selectedStartup.ir_deck_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        IR 덱 보기
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 엔젤클럽 상세 모달 */}
        <Dialog
          open={!!selectedAngel}
          onOpenChange={() => setSelectedAngel(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedAngel?.name} 님의 가입 문의
              </DialogTitle>
            </DialogHeader>
            {selectedAngel && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      이름
                    </label>
                    <p className="mt-1">{selectedAngel.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      이메일
                    </label>
                    <p className="mt-1">{selectedAngel.email}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">
                      문의 일시
                    </label>
                    <p className="mt-1">
                      {formatDate(selectedAngel.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    자기소개 및 가입 동기
                  </label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedAngel.self_introduction}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() =>
                      window.open(`mailto:${selectedAngel.email}`, '_blank')
                    }
                    variant="outline"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    이메일 보내기
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 회원가입 문의 상세 모달 */}
        <Dialog
          open={!!selectedSignup}
          onOpenChange={() => setSelectedSignup(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                회원가입 문의 상세
              </DialogTitle>
            </DialogHeader>
            {selectedSignup && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      시도한 이메일
                    </label>
                    <p className="mt-1">{selectedSignup.attempted_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      로그인 방식
                    </label>
                    <p className="mt-1 capitalize">{selectedSignup.provider}</p>
                  </div>
                  {selectedSignup.searched_email && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">
                        검색한 이메일
                      </label>
                      <p className="mt-1">{selectedSignup.searched_email}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      처리 상태
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          selectedSignup.status === 'pending'
                            ? 'destructive'
                            : selectedSignup.status === 'processed'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {selectedSignup.status === 'pending'
                          ? '미처리'
                          : selectedSignup.status === 'processed'
                            ? '처리중'
                            : '완료'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      문의 일시
                    </label>
                    <p className="mt-1">
                      {formatDate(selectedSignup.created_at)}
                    </p>
                  </div>
                </div>

                {selectedSignup.inquiry_message && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      추가 문의사항
                    </label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                      {selectedSignup.inquiry_message}
                    </p>
                  </div>
                )}

                {selectedSignup.admin_notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      관리자 메모
                    </label>
                    <p className="mt-1 p-3 bg-blue-50 rounded-lg whitespace-pre-wrap">
                      {selectedSignup.admin_notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-4">
                  <Button
                    onClick={() =>
                      window.open(
                        `mailto:${selectedSignup.attempted_email}`,
                        '_blank'
                      )
                    }
                    variant="outline"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    이메일 보내기
                  </Button>
                  {selectedSignup.user_id && (
                    <Button
                      onClick={() =>
                        console.log('사용자 정보 보기:', selectedSignup.user_id)
                      }
                      variant="outline"
                    >
                      <User className="w-4 h-4 mr-2" />
                      사용자 정보 보기
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
