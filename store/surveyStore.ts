import { SurveyData } from '@/types/survey';
import { create } from 'zustand';

interface FundSurveyData {
  surveyData: SurveyData;
  currentPage: number;
  isSubmitting: boolean;
  submitError: Error | null;
  profileId: string | null;
  fundName: string | null;
  timestamp: number;
}

interface SurveyStore {
  // 펀드별 설문조사 데이터 (fund_id를 키로 사용)
  fundSurveys: Record<string, FundSurveyData>;

  // 현재 활성화된 펀드 ID
  activeFundId: string | null;

  // 액션
  updateField: <K extends keyof SurveyData>(
    fundId: string,
    field: K,
    value: SurveyData[K]
  ) => void;
  goToPage: (fundId: string, page: number) => void;
  nextPage: (fundId: string) => void;
  prevPage: (fundId: string) => void;
  resetSurvey: (fundId: string) => void;
  saveToLocalStorage: (fundId: string) => void;
  loadFromLocalStorage: (fundId: string) => boolean;
  clearLocalStorage: (fundId: string) => void;
  setSubmitting: (fundId: string, isSubmitting: boolean) => void;
  setSubmitError: (fundId: string, error: Error | null) => void;
  setProfileId: (fundId: string, profileId: string | null) => void;
  setFundId: (fundId: string, fundName?: string) => void;
  hasCompletedSurvey: (fundId: string) => boolean;
  setActiveFundId: (fundId: string | null) => void;
  getFundSurveyData: (fundId: string) => FundSurveyData;
  getProfileId: (fundId: string) => string | null;

  // 편의성을 위한 현재 활성 펀드 관련 getter
  getCurrentSurveyData: () => SurveyData | null;
  getCurrentPage: () => number;
  getIsSubmitting: () => boolean;
  getSubmitError: () => Error | null;
  getActiveProfileId: () => string | null;
  getFundName: () => string | null;
  saveActiveFundIdToLocalStorage: () => void;
  getActiveFundIdFromLocalStorage: () => string | null;
  clearActiveFundIdFromLocalStorage: () => void;
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
  ceo: undefined,
};

const LOCAL_STORAGE_KEY_PREFIX = 'survey_draft_';

const createInitialFundSurveyData = (): FundSurveyData => ({
  surveyData: { ...initialSurveyData },
  currentPage: 1,
  isSubmitting: false,
  submitError: null,
  profileId: null,
  fundName: null,
  timestamp: Date.now(),
});

export const useSurveyStore = create<SurveyStore>((set, get) => ({
  fundSurveys: {},
  activeFundId: null,

  getFundSurveyData: (fundId: string) => {
    const { fundSurveys } = get();
    // 렌더링 단계에서 상태 업데이트(SET)를 유발하지 않도록, 존재하지 않으면 새 객체만 반환
    return fundSurveys[fundId] || createInitialFundSurveyData();
  },

  updateField: (fundId: string, field, value) => {
    set(state => {
      const previous =
        state.fundSurveys[fundId] || createInitialFundSurveyData();
      return {
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: {
            ...previous,
            surveyData: {
              ...previous.surveyData,
              [field]: value,
            },
            timestamp: Date.now(),
          },
        },
      };
    });
    // 자동 저장
    get().saveToLocalStorage(fundId);
  },

  goToPage: (fundId: string, page: number) => {
    set(state => {
      const previous =
        state.fundSurveys[fundId] || createInitialFundSurveyData();
      return {
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: {
            ...previous,
            currentPage: page,
            timestamp: Date.now(),
          },
        },
      };
    });
    get().saveToLocalStorage(fundId);
  },

  nextPage: (fundId: string) => {
    const { getFundSurveyData } = get();

    const fundData = getFundSurveyData(fundId);
    const { currentPage, surveyData } = fundData;
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

    get().goToPage(fundId, nextPageNumber);
  },

  prevPage: (fundId: string) => {
    const { getFundSurveyData } = get();

    const fundData = getFundSurveyData(fundId);
    const { currentPage, surveyData } = fundData;
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
      get().goToPage(fundId, prevPageNumber);
    }
  },

  resetSurvey: (fundId: string) => {
    set(state => ({
      fundSurveys: {
        ...state.fundSurveys,
        [fundId]: createInitialFundSurveyData(),
      },
    }));
    get().clearLocalStorage(fundId);
  },

  saveToLocalStorage: (fundId: string) => {
    const { getFundSurveyData } = get();

    const fundData = getFundSurveyData(fundId);
    const saveData = {
      ...fundData,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}${fundId}`,
        JSON.stringify(saveData)
      );
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },

  loadFromLocalStorage: (fundId: string) => {
    try {
      const saved = localStorage.getItem(
        `${LOCAL_STORAGE_KEY_PREFIX}${fundId}`
      );
      if (!saved) return false;

      const data = JSON.parse(saved);

      // 24시간 이상 된 데이터는 무시
      if (Date.now() - data.timestamp > 86400000) {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${fundId}`);
        return false;
      }

      set(state => ({
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: data,
        },
      }));

      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  },

  clearLocalStorage: (fundId: string) => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${fundId}`);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  },

  setSubmitting: (fundId: string, isSubmitting: boolean) => {
    set(state => {
      const previous =
        state.fundSurveys[fundId] || createInitialFundSurveyData();
      return {
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: {
            ...previous,
            isSubmitting,
            timestamp: Date.now(),
          },
        },
      };
    });
  },

  setSubmitError: (fundId: string, error: Error | null) => {
    set(state => {
      const previous =
        state.fundSurveys[fundId] || createInitialFundSurveyData();
      return {
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: {
            ...previous,
            submitError: error,
            timestamp: Date.now(),
          },
        },
      };
    });
  },

  setProfileId: (fundId: string, profileId: string | null) => {
    set(state => {
      const previous =
        state.fundSurveys[fundId] || createInitialFundSurveyData();
      return {
        fundSurveys: {
          ...state.fundSurveys,
          [fundId]: {
            ...previous,
            profileId,
            timestamp: Date.now(),
          },
        },
      };
    });
    get().saveToLocalStorage(fundId);
  },

  setFundId: (fundId: string, fundName?: string) => {
    if (fundName) {
      set(state => {
        const previous =
          state.fundSurveys[fundId] || createInitialFundSurveyData();
        return {
          fundSurveys: {
            ...state.fundSurveys,
            [fundId]: {
              ...previous,
              fundName,
              timestamp: Date.now(),
            },
          },
        };
      });
    }
    set({ activeFundId: fundId });
  },

  getProfileId: (fundId: string) => {
    const { getFundSurveyData } = get();
    const fundData = getFundSurveyData(fundId);
    return fundData.profileId;
  },

  hasCompletedSurvey: (fundId: string) => {
    const { getFundSurveyData } = get();
    const fundData = getFundSurveyData(fundId);
    return !!fundData.profileId;
  },

  setActiveFundId: (fundId: string | null) => {
    set({ activeFundId: fundId });
  },

  // 편의성을 위한 현재 활성 펀드 관련 getter
  getCurrentSurveyData: () => {
    const { activeFundId, getFundSurveyData } = get();
    if (!activeFundId) return null;
    return getFundSurveyData(activeFundId).surveyData;
  },

  getCurrentPage: () => {
    const { activeFundId, getFundSurveyData } = get();
    if (!activeFundId) return 1;
    return getFundSurveyData(activeFundId).currentPage;
  },

  getIsSubmitting: () => {
    const { activeFundId, getFundSurveyData } = get();
    if (!activeFundId) return false;
    return getFundSurveyData(activeFundId).isSubmitting;
  },

  getSubmitError: () => {
    const { activeFundId, getFundSurveyData } = get();
    if (!activeFundId) return null;
    return getFundSurveyData(activeFundId).submitError;
  },

  getActiveProfileId: () => {
    const { activeFundId, getProfileId } = get();
    if (!activeFundId) return null;
    return getProfileId(activeFundId);
  },

  getFundName: () => {
    const { activeFundId, getFundSurveyData } = get();
    if (!activeFundId) return null;
    return getFundSurveyData(activeFundId).fundName;
  },

  saveActiveFundIdToLocalStorage: () => {
    const { activeFundId } = get();
    if (activeFundId) {
      localStorage.setItem(
        `${LOCAL_STORAGE_KEY_PREFIX}active_fund_id`,
        activeFundId
      );
    }
  },

  getActiveFundIdFromLocalStorage: () => {
    const activeFundId = localStorage.getItem(
      `${LOCAL_STORAGE_KEY_PREFIX}active_fund_id`
    );
    return activeFundId;
  },

  clearActiveFundIdFromLocalStorage: () => {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}active_fund_id`);
  },
}));
