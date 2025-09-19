'use client';

import SignupInquiryModal from '@/components/auth/SignupInquiryModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Search, User } from 'lucide-react';
import { useState } from 'react';

interface FindEmailFormProps {
  attemptedEmail: string;
  provider: string;
  isAccountCreated?: boolean;
  onLinkSuccess: () => void;
}

interface SearchResult {
  found: boolean;
  canLink: boolean;
  profileId: string | null;
}

export default function FindEmailForm({
  attemptedEmail,
  provider,
  isAccountCreated = false,
  onLinkSuccess,
}: FindEmailFormProps) {
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchEmail.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResult(null);

    try {
      // sessionStorage에서 임시 토큰 가져오기
      const tempToken = sessionStorage.getItem('temp_auth_token');

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (tempToken) {
        headers['Authorization'] = `Bearer ${tempToken}`;
      }

      const response = await fetch('/api/profiles/search-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: searchEmail.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '검색 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      setSearchResult(result);
    } catch (error) {
      console.error('이메일 검색 오류:', error);
      setError(
        error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async () => {
    if (!searchResult?.profileId) return;

    setIsLinking(true);
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

      const response = await fetch('/api/profiles/link-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profileId: searchResult.profileId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '연결 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      console.log('프로필 연결 성공:', result);

      // 성공 시 임시 토큰 정리
      sessionStorage.removeItem('temp_auth_token');

      // 성공 시 콜백 호출
      onLinkSuccess();
    } catch (error) {
      console.error('프로필 연결 오류:', error);
      setError(
        error instanceof Error ? error.message : '연결 중 오류가 발생했습니다.'
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handleInquiryClick = () => {
    setShowInquiryModal(true);
  };

  const handleInquirySubmit = () => {
    setShowInquiryModal(false);
    // 문의 제출 후 처리 (예: 안내 메시지 표시 또는 홈으로 리디렉션)
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Search className="w-6 h-6" />
            이메일 찾기
          </CardTitle>
          <CardDescription className="text-center">
            {isAccountCreated ? (
              <>
                <strong className="text-blue-700">
                  계정 생성이 완료되었습니다!
                </strong>
                <br />
                <br />
                하지만 입력하신 이메일과 일치하는 조합원 정보를 찾을 수
                없습니다. 다른 이메일 주소로 등록된 조합원 정보가 있다면
                아래에서 검색해주세요.
                <br />
                <span className="text-sm text-red-600 mt-2 block">
                  ※ 주의: 이미 계정이 생성되었으므로 <br />
                  다시 회원가입을 시도하지 마세요.
                </span>
              </>
            ) : (
              <>
                회원가입하려는 계정의 이메일과 다른 이메일로 등록된 조합원
                프로필이 있을 수 있습니다. 아래에서 검색해보세요.
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 시도한 이메일 표시 */}
          <div
            className={`p-3 rounded-lg ${
              isAccountCreated
                ? 'bg-green-50 border border-green-200'
                : 'bg-blue-50'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                isAccountCreated ? 'text-green-700' : 'text-blue-700'
              }`}
            >
              {isAccountCreated ? '생성된 계정 이메일:' : '로그인 시도 이메일:'}
            </p>
            <p
              className={isAccountCreated ? 'text-green-900' : 'text-blue-900'}
            >
              {attemptedEmail}
            </p>
            <p
              className={`text-xs mt-1 ${isAccountCreated ? 'text-green-600' : 'text-blue-600'}`}
            >
              {isAccountCreated ? '회원가입 방식:' : '로그인 방식:'} {provider}
            </p>
            {isAccountCreated && (
              <p className="text-xs text-green-800 mt-2 font-medium">
                ✅ 이 이메일로 계정 생성이 완료되었습니다
              </p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 검색 폼 */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label
                htmlFor="search-email"
                className="text-sm font-medium text-gray-700 block mb-1"
              >
                검색할 이메일 주소
              </label>
              <Input
                id="search-email"
                type="email"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                placeholder="example@company.com"
                disabled={isSearching || isLinking}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSearching || isLinking}
            >
              {isSearching ? (
                <>
                  <Search className="w-4 h-4 mr-2 animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  검색하기
                </>
              )}
            </Button>
          </form>

          {/* 검색 결과 */}
          {searchResult && (
            <div className="space-y-3">
              {searchResult.found && searchResult.canLink ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      이메일을 찾았습니다!
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    <strong>{searchEmail}</strong> 주소로 등록된 프로필이
                    있습니다.
                  </p>
                  <Button
                    onClick={handleLink}
                    className="w-full"
                    disabled={isLinking}
                  >
                    {isLinking ? (
                      <>
                        <User className="w-4 h-4 mr-2 animate-pulse" />
                        연결 중...
                      </>
                    ) : (
                      <>
                        <User className="w-4 h-4 mr-2" />이 이메일과 연결하기
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      검색 결과가 없습니다
                    </span>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    입력하신 이메일로 등록된 프로필을 찾을 수 없습니다.
                    <br />
                    관리자에게 문의하시겠습니까?
                  </p>
                  <Button
                    onClick={handleInquiryClick}
                    variant="outline"
                    className="w-full"
                  >
                    문의하기
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 문의 모달 */}
      <SignupInquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        onSubmit={handleInquirySubmit}
        attemptedEmail={attemptedEmail}
        searchedEmail={searchEmail}
        provider={provider}
      />
    </div>
  );
}
