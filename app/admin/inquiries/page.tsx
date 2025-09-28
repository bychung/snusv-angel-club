'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Trash2,
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
  status: string;
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'startup' | 'angel' | 'signup';
    id: string;
    name: string;
  } | null>(null);

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

  const handleDeleteInquiry = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/inquiries/${deleteTarget.type}/${deleteTarget.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        // 삭제 성공 후 목록 새로고침
        await fetchInquiries();
        alert('문의가 성공적으로 삭제되었습니다.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '문의 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('문의 삭제 오류:', error);
      alert('문의 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteConfirm = (
    type: 'startup' | 'angel' | 'signup',
    id: string,
    name: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // 카드 클릭 이벤트 방지
    setDeleteTarget({ type, id, name });
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
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
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(inquiry.created_at)}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={e =>
                              openDeleteConfirm(
                                'startup',
                                inquiry.id,
                                inquiry.company_name,
                                e
                              )
                            }
                            className="opacity-70 hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(inquiry.created_at)}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={e =>
                              openDeleteConfirm(
                                'angel',
                                inquiry.id,
                                inquiry.name,
                                e
                              )
                            }
                            className="opacity-70 hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                              ? '처리완료'
                              : inquiry.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(inquiry.created_at)}
                          </Badge>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={e =>
                              openDeleteConfirm(
                                'signup',
                                inquiry.id,
                                inquiry.attempted_email,
                                e
                              )
                            }
                            className="opacity-70 hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        로그인 방식:{' '}
                        {inquiry.provider === 'google'
                          ? 'Google'
                          : inquiry.provider === 'kakao'
                          ? 'Kakao'
                          : '이메일'}
                      </div>
                      {inquiry.searched_email && (
                        <div className="text-sm text-gray-600 mb-2">
                          검색된 이메일: {inquiry.searched_email}
                        </div>
                      )}
                      {inquiry.inquiry_message && (
                        <p className="text-sm text-gray-700 line-clamp-2">
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

        {/* 삭제 확인 모달 */}
        <Dialog open={!!deleteTarget} onOpenChange={closeDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>문의 삭제</DialogTitle>
              <DialogDescription>
                정말로 이 문의를 삭제하시겠습니까?
                <br />
                <strong>{deleteTarget?.name}</strong>
                <br />
                삭제된 문의는 복구할 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteInquiry}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 스타트업 IR 문의 상세 모달 */}
        <Dialog
          open={!!selectedStartup}
          onOpenChange={() => setSelectedStartup(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>스타트업 IR 문의 상세</DialogTitle>
            </DialogHeader>
            {selectedStartup && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>회사명:</strong> {selectedStartup.company_name}
                    </div>
                    <div>
                      <strong>담당자:</strong> {selectedStartup.contact_person}
                    </div>
                    <div>
                      <strong>직책:</strong> {selectedStartup.position}
                    </div>
                    <div>
                      <strong>신청일:</strong>{' '}
                      {formatDate(selectedStartup.created_at)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">회사 소개</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedStartup.company_description}
                  </p>
                </div>

                {selectedStartup.ir_deck_url && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">첨부 파일</h3>
                    <Button
                      onClick={() =>
                        handleDownloadIRDeck(
                          selectedStartup.id,
                          selectedStartup.company_name
                        )
                      }
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      IR 덱 다운로드
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 엔젤클럽 가입 문의 상세 모달 */}
        <Dialog
          open={!!selectedAngel}
          onOpenChange={() => setSelectedAngel(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>엔젤클럽 가입 문의 상세</DialogTitle>
            </DialogHeader>
            {selectedAngel && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>이름:</strong> {selectedAngel.name}
                    </div>
                    <div>
                      <strong>이메일:</strong> {selectedAngel.email}
                    </div>
                    <div>
                      <strong>신청일:</strong>{' '}
                      {formatDate(selectedAngel.created_at)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">자기소개</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedAngel.self_introduction}
                  </p>
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
              <DialogTitle>회원가입 문의 상세</DialogTitle>
            </DialogHeader>
            {selectedSignup && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>시도한 이메일:</strong>{' '}
                      {selectedSignup.attempted_email}
                    </div>
                    <div>
                      <strong>로그인 방식:</strong>{' '}
                      {selectedSignup.provider === 'google'
                        ? 'Google'
                        : selectedSignup.provider === 'kakao'
                        ? 'Kakao'
                        : '이메일'}
                    </div>
                    <div>
                      <strong>처리 상태:</strong>{' '}
                      {selectedSignup.status === 'pending'
                        ? '미처리'
                        : selectedSignup.status === 'processed'
                        ? '처리완료'
                        : selectedSignup.status}
                    </div>
                    <div>
                      <strong>신청일:</strong>{' '}
                      {formatDate(selectedSignup.created_at)}
                    </div>
                  </div>
                </div>

                {selectedSignup.searched_email && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      검색된 이메일
                    </h3>
                    <p className="text-sm text-gray-700">
                      {selectedSignup.searched_email}
                    </p>
                  </div>
                )}

                {selectedSignup.inquiry_message && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">문의 메시지</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedSignup.inquiry_message}
                    </p>
                  </div>
                )}

                {selectedSignup.admin_notes && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">관리자 메모</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedSignup.admin_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
