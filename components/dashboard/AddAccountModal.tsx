'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuthStore } from '@/store/authStore';
import { AlertTriangle, CircleX, Search, User } from 'lucide-react';
import { useState } from 'react';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SearchResult {
  id?: string;
  name?: string;
  email: string;
  user_id: string;
  entity_type?: 'individual' | 'corporate';
  // status: 'connected' | 'unlinked' | 'conflict' | 'auth_only';
  status: 'connected' | 'conflict' | 'auth_only';
  message: string;
  provider?: string;
}

export default function AddAccountModal({
  isOpen,
  onClose,
  onSuccess,
}: AddAccountModalProps) {
  const { selectedProfileId } = useAuthStore();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'admin' | 'view'>('view');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // 이메일로 사용자 검색
  const handleSearch = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    // 간단한 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setIsSearching(true);
    setError('');
    setSearchResult(null);

    try {
      // 검색 전용 API 호출
      const response = await fetch('/api/profiles/search-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '사용자 검색에 실패했습니다.');
        return;
      }

      if (!result.found) {
        setError(
          result.message || '해당 이메일로 가입된 사용자를 찾을 수 없습니다.'
        );
        return;
      }

      // 검색 결과를 SearchResult 형태로 변환
      setSearchResult({
        id: result.profile?.id,
        name: result.profile?.name || result.user.email.split('@')[0],
        email: result.user.email,
        user_id: result.user.id,
        entity_type: result.profile?.entity_type || 'individual',
        status: result.status,
        message: result.message,
        provider: result.user.provider,
      });
    } catch (error) {
      console.error('사용자 검색 실패:', error);
      setError('사용자 검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 권한 부여
  const handleAddAccess = async () => {
    if (!selectedProfileId || !searchResult) return;

    setIsAdding(true);
    setError('');

    try {
      // link-profile-to-user API를 호출해서 연결 및 권한 부여
      const response = await fetch('/api/profiles/link-profile-to-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchResult.email,
          permission: permission,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '권한 부여에 실패했습니다.');
        return;
      }

      if (!result.found) {
        setError(result.message || '권한 부여에 실패했습니다.');
        return;
      }

      if (!result.granted && !result.permission) {
        setError(result.message || '권한 부여에 실패했습니다.');
        return;
      }

      // 성공
      onSuccess();
    } catch (error: any) {
      setError(error.message || '권한 부여에 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  // 모달 리셋
  const handleClose = () => {
    setEmail('');
    setPermission('view');
    setSearchResult(null);
    setError('');
    onClose();
  };

  // Enter 키로 검색
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 이메일 입력 초기화
  const clearEmail = () => {
    setEmail('');
    setError('');
    setSearchResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>계정 추가</DialogTitle>
          <DialogDescription>
            이메일 주소로 사용자를 검색하고 권한을 부여하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 이메일 검색 */}
          <div className="space-y-2">
            <Label htmlFor="email">이메일 주소</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyPress={handleEmailKeyPress}
                disabled={isSearching}
                className="pr-10"
              />
              {email.length > 0 && (
                <Button
                  onClick={clearEmail}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                  disabled={isSearching}
                >
                  <CircleX className="h-4 w-4 text-gray-500" />
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSearch}
                disabled={isSearching || !email.trim()}
                className="flex items-center space-x-1"
              >
                <Search className="h-4 w-4" />
                <span>{isSearching ? '검색 중...' : '검색'}</span>
              </Button>
            </div>
          </div>

          {/* 에러 표시 */}
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-700 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 검색 결과 */}
          {searchResult && (
            <div className="space-y-4">
              {/* 사용자 정보 카드 */}
              <div
                className={`p-4 border rounded-lg ${
                  searchResult.status === 'connected'
                    ? 'bg-blue-50 border-blue-200'
                    : searchResult.status === 'conflict'
                    ? 'bg-red-50 border-red-200'
                    : searchResult.status === 'auth_only'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User
                      className={`h-8 w-8 ${
                        searchResult.status === 'connected'
                          ? 'text-blue-600'
                          : searchResult.status === 'conflict'
                          ? 'text-red-600'
                          : searchResult.status === 'auth_only'
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}
                    />
                    <div>
                      <p
                        className={`font-medium ${
                          searchResult.status === 'connected'
                            ? 'text-blue-900'
                            : searchResult.status === 'conflict'
                            ? 'text-red-900'
                            : searchResult.status === 'auth_only'
                            ? 'text-green-900'
                            : 'text-yellow-900'
                        }`}
                      >
                        {searchResult.name}
                      </p>
                      <p
                        className={`text-sm ${
                          searchResult.status === 'connected'
                            ? 'text-blue-700'
                            : searchResult.status === 'conflict'
                            ? 'text-red-700'
                            : searchResult.status === 'auth_only'
                            ? 'text-green-700'
                            : 'text-yellow-700'
                        }`}
                      >
                        {searchResult.email}
                      </p>
                      <p
                        className={`text-xs ${
                          searchResult.status === 'connected'
                            ? 'text-blue-600'
                            : searchResult.status === 'conflict'
                            ? 'text-red-600'
                            : searchResult.status === 'auth_only'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {searchResult.status === 'auth_only'
                          ? `${
                              searchResult.provider === 'google'
                                ? 'Google로 가입됨'
                                : searchResult.provider === 'kakao'
                                ? 'Kakao로 가입됨'
                                : 'Email로 가입됨'
                            } (프로필 연결 안됨)`
                          : searchResult.entity_type === 'individual'
                          ? '개인'
                          : '법인'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      searchResult.status === 'connected'
                        ? 'bg-blue-100 text-blue-800'
                        : searchResult.status === 'conflict'
                        ? 'bg-red-100 text-red-800'
                        : searchResult.status === 'auth_only'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {searchResult.status === 'connected'
                      ? '연결됨'
                      : searchResult.status === 'conflict'
                      ? '연결 불가'
                      : searchResult.status === 'auth_only'
                      ? '연결 가능'
                      : '미연결'}
                  </span>
                </div>
                <p
                  className={`text-sm mt-2 ${
                    searchResult.status === 'connected'
                      ? 'text-blue-700'
                      : searchResult.status === 'conflict'
                      ? 'text-red-700'
                      : searchResult.status === 'auth_only'
                      ? 'text-green-700'
                      : 'text-yellow-700'
                  }`}
                >
                  {searchResult.message}
                </p>
              </div>

              {/* 권한 선택 (충돌 상태가 아닌 경우에만 표시) */}
              {searchResult.status !== 'conflict' && (
                <div className="space-y-3">
                  <Label>부여할 권한</Label>
                  <RadioGroup
                    value={permission}
                    onValueChange={value =>
                      setPermission(value as 'admin' | 'view')
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="view" id="view" />
                      <Label htmlFor="view" className="cursor-pointer">
                        <div>
                          <p className="font-medium">조회 권한</p>
                          <p className="text-sm text-gray-500">
                            프로필 정보 및 투자 내역 조회만 가능
                          </p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="admin" />
                      <Label htmlFor="admin" className="cursor-pointer">
                        <div>
                          <p className="font-medium">관리 권한</p>
                          <p className="text-sm text-gray-500">
                            프로필 정보 수정 및 투자 내역 수정 가능
                          </p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* 하단 버튼 */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            {searchResult && searchResult.status === 'connected' && (
              <Button disabled className="bg-gray-300">
                이미 연결된 계정입니다
              </Button>
            )}
            {searchResult && searchResult.status === 'auth_only' && (
              <Button onClick={handleAddAccess} disabled={isAdding}>
                {isAdding ? '연결 및 권한 부여 중...' : '연결하고 권한 부여'}
              </Button>
            )}
            {searchResult && searchResult.status === 'conflict' && (
              <Button disabled className="bg-gray-300">
                권한 부여 불가 (충돌)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
