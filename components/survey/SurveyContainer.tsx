'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { useSurveyStore } from '@/store/surveyStore';
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

export default function SurveyContainer() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    surveyData,
    currentPage,
    updateField,
    nextPage,
    goToPage,
    resetSurvey,
    loadFromLocalStorage,
    clearLocalStorage,
    setProfileId,
  } = useSurveyStore();

  // 컴포넌트 마운트 시 로컬스토리지에서 데이터 복원 (한 번만 실행)
  useEffect(() => {
    let mounted = true;

    const restoreData = () => {
      if (mounted && !isInitialized) {
        const hasData = loadFromLocalStorage();
        if (hasData) {
          console.log('설문 데이터가 복원되었습니다.');
        }
        setIsInitialized(true);
      }
    };

    restoreData();

    return () => {
      mounted = false;
    };
  }, []); // 완전히 빈 의존성 배열

  // 조건부 페이지 스킵 로직을 제거하고, 렌더링에서 직접 처리

  // 유효성 검사 함수들
  const validateName = () => {
    if (!surveyData.name || surveyData.name.trim().length < 2) {
      return '이름 또는 회사명을 입력해주세요 (최소 2자)';
    }
    return null;
  };

  const validateInvestmentUnits = () => {
    if (!surveyData.investmentUnits || surveyData.investmentUnits < 1) {
      return '최소 1좌 이상 입력해주세요';
    }
    return null;
  };

  const validatePhone = () => {
    const phoneRegex = /^0\d{1,2}-\d{3,4}-\d{4}$/;
    if (!surveyData.phone || !phoneRegex.test(surveyData.phone)) {
      return '올바른 전화번호 형식이 아닙니다';
    }
    return null;
  };

  const validateEmail = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!surveyData.email || !emailRegex.test(surveyData.email)) {
      return '올바른 이메일 형식이 아닙니다';
    }
    return null;
  };

  const validateAddress = () => {
    if (!surveyData.address || surveyData.address.trim().length < 5) {
      return '주소를 입력해주세요 (최소 5자)';
    }
    return null;
  };

  const validateEntityType = () => {
    if (!surveyData.entityType) {
      return '개인 또는 법인을 선택해주세요';
    }
    return null;
  };

  const validateBirthDate = () => {
    if (surveyData.entityType === 'individual' && !surveyData.birthDate) {
      return '생년월일을 입력해주세요';
    }
    return null;
  };

  const validateBusinessNumber = () => {
    if (surveyData.entityType === 'corporate') {
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
    const error = validateCurrentPage();
    if (error) {
      alert(error);
      return;
    }
    nextPage();
  };

  // 제출 핸들러
  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      const supabase = createClient();

      // 1. profiles 테이블에 upsert (전화번호 기준)
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData as any, {
          onConflict: 'phone',
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      // 2. 고정 펀드 ID 가져오기 (하드코딩 또는 환경변수)
      // 실제 운영시에는 funds 테이블에서 조회
      const fundId = process.env.NEXT_PUBLIC_FUND_ID || 'default-fund-id';

      // 3. fund_members 테이블에 upsert
      const fundMemberData = {
        fund_id: fundId,
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
      setProfileId((profile as any).id);

      // 9페이지로 이동 (제출 완료 페이지)
      nextPage();
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
    resetSurvey();
    router.push('/');
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
                value={surveyData.name}
                onChange={value => updateField('name', value)}
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
                value={surveyData.investmentUnits}
                onChange={value => updateField('investmentUnits', value)}
                placeholder="20"
                min={1}
                required
              />
              <div className="text-sm text-gray-600">
                출자금액: {(surveyData.investmentUnits || 0).toLocaleString()}좌 ={' '}
                {((surveyData.investmentUnits || 0) * 1000000).toLocaleString()}원
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
                value={surveyData.phone}
                onChange={value => updateField('phone', value)}
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
                value={surveyData.address}
                onChange={value => updateField('address', value)}
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
                value={surveyData.email}
                onChange={value => updateField('email', value)}
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
                value={surveyData.entityType || ''}
                onChange={value => updateField('entityType', value as 'individual' | 'corporate')}
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
                value={surveyData.birthDate || ''}
                onChange={value => updateField('birthDate', value)}
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
                value={surveyData.businessNumber || ''}
                onChange={value => updateField('businessNumber', value)}
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
                향후 진행되는 내용 확인 등을 위해 회원가입 하시겠습니까?
                <br />
                기존에 입력하신 정보로 회원 가입이 진행되므로 추가 입력 정보가 거의 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={handleExit} variant="outline" className="flex-1" size="lg">
                  페이지에서 나가기
                </Button>
                <Button onClick={handleSignup} className="flex-1" size="lg">
                  회원 가입하기
                </Button>
              </div>
            </CardContent>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {currentPage < 9 && <SurveyProgress />}
        {currentPage < 9 && <SurveyNavigation />}

        <Card>{renderPage()}</Card>
      </div>
    </div>
  );
}
