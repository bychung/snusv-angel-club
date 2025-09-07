import { SurveyData } from '@/types/survey';
import { create } from 'zustand';

interface SurveyStore {
  // 설문 데이터
  surveyData: SurveyData;

  // 페이지 관리
  currentPage: number;

  // 제출 상태
  isSubmitting: boolean;
  submitError: Error | null;

  // 저장된 profile_id (설문조사 완료 후 회원가입용)
  profileId: string | null;

  // 펀드 ID
  fundId: string | null;

  // 펀드명
  fundName: string | null;

  // 액션
  updateField: <K extends keyof SurveyData>(field: K, value: SurveyData[K]) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetSurvey: () => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean; // 복원 성공 여부 반환
  clearLocalStorage: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (error: Error | null) => void;
  setProfileId: (profileId: string | null) => void;
  setFundId: (fundId: string | null) => void;
  setFundName: (fundName: string | null) => void;
  hasCompletedSurvey: () => boolean; // 설문조사 완료 여부 확인
}

const initialSurveyData: SurveyData = {
  name: '',
  investmentUnits: 0,
  phone: '',
  address: '',
  email: '',
  entityType: null,
  birthDate: undefined,
  businessNumber: undefined,
};

const LOCAL_STORAGE_KEY = 'survey_draft';

export const useSurveyStore = create<SurveyStore>((set, get) => ({
  surveyData: initialSurveyData,
  currentPage: 1,
  isSubmitting: false,
  submitError: null,
  profileId: null,
  fundId: null,
  fundName: null,

  updateField: (field, value) => {
    set(state => ({
      surveyData: {
        ...state.surveyData,
        [field]: value,
      },
    }));
    // 자동 저장
    get().saveToLocalStorage();
  },

  goToPage: page => {
    set({ currentPage: page });
    get().saveToLocalStorage();
  },

  nextPage: () => {
    const { currentPage, surveyData } = get();
    let nextPageNumber = currentPage + 1;

    // 조건부 페이지 네비게이션 로직
    if (currentPage === 6) {
      // 개인/법인 선택 후
      if (surveyData.entityType === 'individual') {
        nextPageNumber = 7; // 생년월일 페이지로
      } else if (surveyData.entityType === 'corporate') {
        nextPageNumber = 8; // 사업자번호 페이지로
      }
    } else if (currentPage === 7 || currentPage === 8) {
      // 생년월일이나 사업자번호 입력 후 제출 페이지로
      nextPageNumber = 9;
    }

    set({ currentPage: nextPageNumber });
    get().saveToLocalStorage();
  },

  prevPage: () => {
    const { currentPage, surveyData } = get();
    let prevPageNumber = currentPage - 1;

    // 조건부 페이지 네비게이션 로직
    if (currentPage === 9) {
      // 제출 페이지에서 뒤로가기
      if (surveyData.entityType === 'individual') {
        prevPageNumber = 7;
      } else if (surveyData.entityType === 'corporate') {
        prevPageNumber = 8;
      }
    } else if (currentPage === 7 || currentPage === 8) {
      // 생년월일/사업자번호 페이지에서 뒤로가기
      prevPageNumber = 6;
    }

    if (prevPageNumber >= 1) {
      set({ currentPage: prevPageNumber });
      get().saveToLocalStorage();
    }
  },

  resetSurvey: () => {
    const { fundId } = get();
    set({
      surveyData: initialSurveyData,
      currentPage: 1,
      isSubmitting: false,
      submitError: null,
      profileId: null,
      // fundId는 유지
    });
    get().clearLocalStorage();
  },

  saveToLocalStorage: () => {
    const { surveyData, currentPage, profileId, fundId, fundName } = get();
    const saveData = {
      surveyData,
      currentPage,
      profileId,
      fundId,
      fundName,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saveData));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return false;

      const data = JSON.parse(saved);

      // 24시간 이상 된 데이터는 무시
      if (Date.now() - data.timestamp > 86400000) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return false;
      }

      set({
        surveyData: data.surveyData,
        currentPage: data.currentPage,
        profileId: data.profileId || null,
        fundId: data.fundId || null,
        fundName: data.fundName || null,
      });

      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  },

  clearLocalStorage: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },

  setSubmitting: isSubmitting => {
    set({ isSubmitting });
  },

  setSubmitError: error => {
    set({ submitError: error });
  },

  setProfileId: profileId => {
    set({ profileId });
  },

  setFundId: fundId => {
    set({ fundId });
  },

  setFundName: fundName => {
    set({ fundName });
  },

  hasCompletedSurvey: () => {
    const { profileId } = get();
    return !!profileId;
  },
}));
