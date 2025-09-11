'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useSurveyStore } from '@/store/surveyStore';
import { Chrome, MessageSquare, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Import all input components
import BirthDateInput from './inputs/BirthDateInput';
import BusinessNumberInput from './inputs/BusinessNumberInput';
import EmailInput from './inputs/EmailInput';
import NumberInput from './inputs/NumberInput';
import PhoneInput from './inputs/PhoneInput';
import RadioSelect from './inputs/RadioSelect';
import TextInput from './inputs/TextInput';

// Navigation components
import SurveyNavigation from './SurveyNavigation';
import SurveyProgress from './SurveyProgress';

export default function SurveyContainer({ fundId }: { fundId?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const store = useSurveyStore();
  const { user, profile, signInWithOAuth, isLoading: authLoading } = useAuthStore();
  const activeFundId = fundId || store.activeFundId;

  // 로그인된 사용자 여부
  const isLoggedInUser = !!user;

  // 현재 펀드의 설문조사 데이터 가져오기
  const surveyData = activeFundId ? store.getFundSurveyData(activeFundId).surveyData : null;
  const currentPage = activeFundId ? store.getFundSurveyData(activeFundId).currentPage : 1;
  const fundName = activeFundId ? store.getFundSurveyData(activeFundId).fundName : null;

  // 설문조사 완료 상태 확인
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

  // 펀드 정보 조회
  const fetchFundInfo = async (fundIdToFetch: string) => {
    try {
      const supabase = createClient();
      const { data: fund, error } = await supabase
        .from('funds')
        .select('name')
        .eq('id', fundIdToFetch)
        .single();

      if (error) {
        console.error('펀드 정보 조회 실패:', error);
        // 펀드가 존재하지 않더라도 계속 진행하도록 설정
        if (error.code === 'PGRST116') {
          store.setFundId(fundIdToFetch, '알 수 없는 펀드');
        }
        return;
      }

      if (fund) {
        store.setFundId(fundIdToFetch, fund.name);
      }
    } catch (error) {
      console.error('펀드 정보 조회 중 오류:', error);
      // 오류가 발생해도 기본값으로 진행
      store.setFundId(fundIdToFetch, '알 수 없는 펀드');
    }
  };

  // 로그인된 사용자의 프로필 정보를 설문 데이터에 자동 채우기
  const populateUserData = async () => {
    if (!isLoggedInUser || !profile || !activeFundId || profileLoaded) return;

    console.log('회원 정보를 설문에 자동 입력합니다:', profile);

    // 기존 설문 데이터가 있는지 확인
    const existingData = store.getFundSurveyData(activeFundId).surveyData;

    // 프로필 정보로 설문 데이터 업데이트 (기존 데이터가 없거나 비어있는 경우에만)
    const updates: any = {};

    if (!existingData?.name) updates.name = profile.name || '';
    if (!existingData?.phone) updates.phone = profile.phone || '';
    if (!existingData?.email) updates.email = profile.email || '';
    if (!existingData?.address) updates.address = profile.address || '';
    if (!existingData?.entityType) updates.entityType = profile.entity_type || 'individual';
    if (!existingData?.birthDate && profile.birth_date) updates.birthDate = profile.birth_date;
    if (!existingData?.businessNumber && profile.business_number)
      updates.businessNumber = profile.business_number;

    // 업데이트할 데이터가 있으면 적용
    if (Object.keys(updates).length > 0) {
      Object.entries(updates).forEach(([field, value]) => {
        store.updateField(activeFundId, field as any, value);
      });
      console.log('회원 정보 자동 입력 완료:', updates);
    }

    setProfileLoaded(true);
  };

  // 컴포넌트 마운트 시 fundId 설정 및 로컬스토리지에서 데이터 복원
  useEffect(() => {
    let mounted = true;

    const restoreData = async () => {
      if (mounted && !isInitialized) {
        // authLoading이 진행 중이면 대기
        if (authLoading) {
          console.log('[SurveyContainer] Auth still loading, waiting...');
          return;
        }

        console.log('[SurveyContainer] Initializing survey container');

        try {
          // fundId가 없으면 홈페이지로 리다이렉트
          if (!fundId && !store.activeFundId) {
            router.push('/');
            return;
          }

          // fundId가 제공되면 스토어에 설정
          if (fundId) {
            store.setActiveFundId(fundId);
            store.setFundId(fundId);
            // 펀드 정보 조회
            await fetchFundInfo(fundId);
          } else if (store.activeFundId && !fundName) {
            // 스토어에 fundId는 있지만 fundName이 없으면 조회
            await fetchFundInfo(store.activeFundId);
          }

          const currentFundId = fundId || store.activeFundId;
          if (currentFundId) {
            // 비로그인 사용자의 경우 로컬 스토리지에서 완료 여부 확인
            if (!isLoggedInUser) {
              const localData = store.getFundSurveyData(currentFundId);
              if (localData.currentPage === 9) {
                // 9페이지(완료 페이지)에 있다면 이미 제출된 것으로 처리
                setIsAlreadySubmitted(true);
              }
            }

            const hasData = store.loadFromLocalStorage(currentFundId);
            if (hasData) {
              console.log('설문 데이터가 복원되었습니다.');
            }
          }
        } catch (error) {
          console.error('초기화 중 오류:', error);
        } finally {
          setIsInitialized(true);
        }
      }
    };

    restoreData();

    return () => {
      mounted = false;
    };
  }, [fundId, isInitialized, authLoading]);

  // 프로필 데이터 자동 채우기
  useEffect(() => {
    if (isInitialized && isLoggedInUser && activeFundId) {
      populateUserData();
    }
  }, [isInitialized, isLoggedInUser, profile, activeFundId]);

  // 조건부 페이지 스킵 로직을 제거하고, 렌더링에서 직접 처리

  // 유효성 검사 함수들
  const validateName = () => {
    if (!surveyData?.name || surveyData.name.trim().length < 2) {
      return '이름 또는 회사명을 입력해주세요 (최소 2자)';
    }
    return null;
  };

  const validateInvestmentUnits = () => {
    if (!surveyData?.investmentUnits || surveyData.investmentUnits < 1) {
      return '최소 1좌 이상 입력해주세요';
    }
    return null;
  };

  const validatePhone = () => {
    const phoneRegex = /^0\d{1,2}-\d{3,4}-\d{4}$/;
    if (!surveyData?.phone || !phoneRegex.test(surveyData.phone)) {
      return '올바른 전화번호 형식이 아닙니다';
    }
    return null;
  };

  const validateEmail = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!surveyData?.email || !emailRegex.test(surveyData.email)) {
      return '올바른 이메일 형식이 아닙니다';
    }
    return null;
  };

  const validateAddress = () => {
    if (!surveyData?.address || surveyData.address.trim().length < 5) {
      return '주소를 입력해주세요 (최소 5자)';
    }
    return null;
  };

  const validateEntityType = () => {
    if (!surveyData?.entityType) {
      return '개인 또는 법인을 선택해주세요';
    }
    return null;
  };

  const validateBirthDate = () => {
    if (surveyData?.entityType === 'individual' && !surveyData.birthDate) {
      return '생년월일을 입력해주세요';
    }
    return null;
  };

  const validateBusinessNumber = () => {
    if (surveyData?.entityType === 'corporate') {
      const businessNumberRegex = /^\d{3}-\d{2}-\d{5}$/;
      if (!surveyData.businessNumber || !businessNumberRegex.test(surveyData.businessNumber)) {
        return '올바른 사업자번호 형식이 아닙니다 (xxx-xx-xxxxx)';
      }
    }
    return null;
  };

  // 페이지별 유효성 검사
  const validateCurrentPage = () => {
    switch (currentPage) {
      case 1:
        return validateName();
      case 2:
        return validateInvestmentUnits();
      case 3:
        return validatePhone();
      case 4:
        return validateAddress();
      case 5:
        return validateEmail();
      case 6:
        return validateEntityType();
      case 7:
        return validateBirthDate();
      case 8:
        return validateBusinessNumber();
      default:
        return null;
    }
  };

  // 다음 버튼 클릭 핸들러
  const handleNext = () => {
    if (!activeFundId) return;
    const error = validateCurrentPage();
    if (error) {
      alert(error);
      return;
    }
    store.nextPage(activeFundId);
  };

  // 제출 핸들러
  const handleSubmit = async () => {
    if (!activeFundId || !surveyData) return;

    setIsLoading(true);
    setSubmitError(null);

    try {
      const supabase = createClient();

      // 1. profiles 테이블에 upsert
      const profileData = {
        name: surveyData.name,
        phone: surveyData.phone,
        email: surveyData.email,
        entity_type: surveyData.entityType as 'individual' | 'corporate',
        birth_date: surveyData.entityType === 'individual' ? surveyData.birthDate || null : null,
        business_number:
          surveyData.entityType === 'corporate' ? surveyData.businessNumber || null : null,
        address: surveyData.address,
        updated_at: new Date().toISOString(),
      };

      let profile;
      let profileError;

      if (isLoggedInUser && user) {
        // 로그인된 사용자인 경우 user_id로 업데이트
        const result = await supabase
          .from('profiles')
          .update(profileData as any)
          .eq('user_id', user.id)
          .select()
          .single();

        profile = result.data;
        profileError = result.error;
      } else {
        // 비로그인 사용자인 경우 이메일 기준으로 upsert
        const result = await supabase
          .from('profiles')
          .upsert(profileData as any, {
            onConflict: 'email',
          })
          .select()
          .single();

        profile = result.data;
        profileError = result.error;
      }

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 2. 펀드 ID 확인
      if (!activeFundId) {
        throw new Error('펀드 ID가 필요합니다. URL에 fund_id 파라미터를 포함해주세요.');
      }

      // 3. fund_members 테이블에 upsert
      const fundMemberData = {
        fund_id: activeFundId,
        profile_id: (profile as any).id,
        investment_units: surveyData.investmentUnits,
        updated_at: new Date().toISOString(),
      };

      const { error: fundMemberError } = await supabase
        .from('fund_members')
        .upsert(fundMemberData as any, {
          onConflict: 'profile_id,fund_id',
        });

      if (fundMemberError) {
        throw new Error(fundMemberError.message);
      }

      // 성공 시 profileId 저장 (회원가입시 매칭용)
      store.setProfileId(activeFundId, (profile as any).id);

      // 9페이지로 이동 (제출 완료 페이지)
      store.nextPage(activeFundId);
    } catch (error) {
      console.error('제출 오류:', error);
      setSubmitError(error instanceof Error ? error.message : '제출 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 페이지로 이동
  const handleSignup = () => {
    router.push('/signup');
  };

  // 페이지 나가기
  const handleExit = () => {
    if (activeFundId) {
      store.resetSurvey(activeFundId);
    }
    router.push('/');
  };

  // 대시보드로 이동
  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  // OAuth 로그인 핸들러
  const handleOAuthLogin = async (provider: 'google' | 'kakao') => {
    try {
      await signInWithOAuth(provider);
    } catch (error) {
      console.error('OAuth 로그인 실패:', error);
    }
  };

  // 페이지별 렌더링
  const renderPage = () => {
    switch (currentPage) {
      case 1:
        return (
          <>
            <CardHeader>
              <CardTitle>
                출자하실분의 성함 또는 회사명((주) 및 주식회사 포함)을 알려주세요.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextInput
                value={surveyData?.name || ''}
                onChange={value => activeFundId && store.updateField(activeFundId, 'name', value)}
                placeholder="홍길동 또는 (주)회사명"
                required
              />
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 2:
        return (
          <>
            <CardHeader>
              <CardTitle>출자좌수를 알려주세요.</CardTitle>
              <CardDescription>
                출자금액 1백만원당 1좌입니다. 만약 2천만원을 출자하실 계획이라면, 20(좌)을 입력해
                주시면 됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NumberInput
                value={surveyData?.investmentUnits || 0}
                onChange={value =>
                  activeFundId && store.updateField(activeFundId, 'investmentUnits', value)
                }
                placeholder="20"
                min={1}
                required
              />
              <div className="text-sm text-gray-600">
                출자금액: {(surveyData?.investmentUnits || 0).toLocaleString()}좌 ={' '}
                {((surveyData?.investmentUnits || 0) * 1000000).toLocaleString()}원
              </div>
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 3:
        return (
          <>
            <CardHeader>
              <CardTitle>연락 가능한 전화번호를 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PhoneInput
                value={surveyData?.phone || ''}
                onChange={value => activeFundId && store.updateField(activeFundId, 'phone', value)}
                required
              />
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 4:
        return (
          <>
            <CardHeader>
              <CardTitle>주소를 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TextInput
                value={surveyData?.address || ''}
                onChange={value =>
                  activeFundId && store.updateField(activeFundId, 'address', value)
                }
                placeholder="서울특별시 강남구..."
                required
              />
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 5:
        return (
          <>
            <CardHeader>
              <CardTitle>이메일을 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmailInput
                value={surveyData?.email || ''}
                onChange={value => activeFundId && store.updateField(activeFundId, 'email', value)}
                required
              />
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 6:
        return (
          <>
            <CardHeader>
              <CardTitle>개인 or 법인을 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioSelect
                value={surveyData?.entityType || ''}
                onChange={value =>
                  activeFundId &&
                  store.updateField(activeFundId, 'entityType', value as 'individual' | 'corporate')
                }
                options={[
                  { value: 'individual', label: '개인' },
                  { value: 'corporate', label: '법인' },
                ]}
                required
              />
              <Button onClick={handleNext} className="w-full" size="lg">
                다음
              </Button>
            </CardContent>
          </>
        );

      case 7:
        // 생년월일 입력 페이지 (개인)
        return (
          <>
            <CardHeader>
              <CardTitle>생년월일을 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BirthDateInput
                value={surveyData?.birthDate || ''}
                onChange={value =>
                  activeFundId && store.updateField(activeFundId, 'birthDate', value)
                }
                required
              />
              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? '제출 중...' : '제출하기'}
              </Button>
              {submitError && <div className="text-sm text-red-500 mt-2">{submitError}</div>}
            </CardContent>
          </>
        );

      case 8:
        // 사업자번호 입력 페이지 (법인)
        return (
          <>
            <CardHeader>
              <CardTitle>사업자등록번호를 알려주세요.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BusinessNumberInput
                value={surveyData?.businessNumber || ''}
                onChange={value =>
                  activeFundId && store.updateField(activeFundId, 'businessNumber', value)
                }
                required
              />
              <Button onClick={handleSubmit} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? '제출 중...' : '제출하기'}
              </Button>
              {submitError && <div className="text-sm text-red-500 mt-2">{submitError}</div>}
            </CardContent>
          </>
        );

      case 9:
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">제출이 완료되었습니다!</CardTitle>
              <CardDescription className="mt-4">
                {isLoggedInUser ? (
                  <>
                    설문이 성공적으로 제출되었습니다.
                    <br />
                    대시보드에서 출자(의향) 현황을 확인하실 수 있습니다.
                  </>
                ) : (
                  <>
                    향후 진행되는 내용 확인 등을 위해 회원가입 하시겠습니까?
                    <br />
                    기존에 입력하신 정보로 회원 가입이 진행되므로 추가 입력 정보가 거의 없습니다.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={handleExit} variant="outline" className="flex-1" size="lg">
                  페이지에서 나가기
                </Button>
                {isLoggedInUser ? (
                  <Button onClick={handleGoToDashboard} className="flex-1" size="lg">
                    대시보드로 이동
                  </Button>
                ) : (
                  <Button onClick={handleSignup} className="flex-1" size="lg">
                    회원 가입하기
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        );

      default:
        return null;
    }
  };

  // 이미 제출된 설문조사에 대한 안내 페이지
  if (isAlreadySubmitted && !isLoggedInUser) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="container max-w-2xl mx-auto px-4">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-green-600">
                출자 의향 설문조사가 완료되었습니다!
              </CardTitle>
              <CardDescription className="mt-4">
                이 설문조사는 이미 제출이 완료되었습니다.
                <br />
                추가적인 수정이 필요하시면 관리자에게 문의해 주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 font-medium">
                  {fundName && (
                    <>
                      <b>{fundName}</b>에 대한{' '}
                    </>
                  )}
                  출자 의향 설문조사가 성공적으로 제출되었습니다.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  회원가입을 통해 출자 현황을 지속적으로 확인하실 수 있습니다.
                </p>
                <Button onClick={() => router.push('/signup')} className="mr-2">
                  회원 가입하기
                </Button>
                <Button onClick={() => router.push('/')} variant="outline">
                  홈으로 이동
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 로딩 상태 확인 - authLoading이 완료되고 초기화될 때까지 대기
  const isUserDataLoading = () => {
    // 인증 관련 로딩 중
    if (authLoading) {
      console.log('[SurveyContainer] Auth still loading, waiting for completion...');
      return true;
    }

    // 기본 초기화가 완료되지 않은 경우
    if (!isInitialized || !activeFundId || !surveyData) {
      console.log('[SurveyContainer] Basic initialization not complete...');
      return true;
    }

    console.log('[SurveyContainer] Loading completed, ready to render survey');
    return false;
  };

  // fundId가 없거나 사용자 데이터가 로딩 중이면 로딩 상태 표시
  if (isUserDataLoading()) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="text-lg text-gray-600">
            {authLoading
              ? '사용자 정보를 확인하고 있습니다...'
              : '출자 의향 설문조사를 준비하고 있습니다...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* 로그인 옵션 */}
        {!isLoggedInUser && currentPage < 9 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-blue-800">
                  기존 회원이신가요? 로그인하시면 정보가 자동으로 입력됩니다.
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleOAuthLogin('google')}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={authLoading}
                >
                  <Chrome className="h-3 w-3 mr-1" />
                  Google
                </Button>
                <Button
                  onClick={() => handleOAuthLogin('kakao')}
                  variant="outline"
                  size="sm"
                  className="text-xs bg-yellow-400 hover:bg-yellow-500 border-yellow-400"
                  disabled={authLoading}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Kakao
                </Button>
              </div>
            </div>
          </div>
        )}

        {currentPage < 9 && <SurveyProgress />}
        {currentPage < 9 && <SurveyNavigation />}

        {/* 펀드 설명 문구 */}
        {fundName && currentPage < 9 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-center text-blue-800 font-medium">
              <b>{fundName}</b>에 대한 출자 의향을 묻는 조사입니다. <br />
              {isLoggedInUser ? (
                <>
                  회원님의 기존 정보가 자동으로 입력되었습니다. 수정이 필요한 경우 직접 수정해
                  주세요.
                </>
              ) : (
                <>마지막까지 입력 후 제출을 부탁드립니다.</>
              )}
            </p>
          </div>
        )}

        <Card>{renderPage()}</Card>
      </div>
    </div>
  );
}
