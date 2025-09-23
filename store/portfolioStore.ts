import { CompanyDocumentCategory } from '@/types/company-documents';
import type {
  FundPortfolioResponse,
  InvestmentWithDetails,
} from '@/types/investments';
import { create } from 'zustand';

// 포트폴리오 데이터 타입 (기존 API 응답과 일치)
type PortfolioData = FundPortfolioResponse;

interface DocumentAvailability {
  hasIR: boolean;
  hasInvestmentReport: boolean;
}

interface FundPortfolioData {
  portfolio: PortfolioData | null;
  documentAvailability: Record<string, DocumentAvailability>;
  loading: boolean;
  error: string | null;
  lastFetchedAt: number; // 마지막 fetch 시간
}

interface PortfolioStore {
  // 펀드별 포트폴리오 데이터 (fund_id를 키로 사용)
  fundPortfolios: Record<string, FundPortfolioData>;

  // 액션
  getPortfolioData: (fundId: string) => FundPortfolioData;
  loadPortfolio: (fundId: string) => Promise<void>;
  setLoading: (fundId: string, loading: boolean) => void;
  setError: (fundId: string, error: string | null) => void;
  setPortfolio: (fundId: string, portfolio: PortfolioData) => void;
  setDocumentAvailability: (
    fundId: string,
    availability: Record<string, DocumentAvailability>
  ) => void;
  clearPortfolio: (fundId: string) => void;
  shouldRefetch: (fundId: string, maxAgeMs?: number) => boolean;
}

// 기본 포트폴리오 데이터 생성
const createInitialFundPortfolioData = (): FundPortfolioData => ({
  portfolio: null,
  documentAvailability: {},
  loading: false,
  error: null,
  lastFetchedAt: 0,
});

// 특정 투자의 문서 유무 확인
const checkDocumentAvailability = async (
  fundId: string,
  companyId: string
): Promise<DocumentAvailability> => {
  try {
    const response = await fetch(
      `/api/funds/${fundId}/companies/${companyId}/documents`
    );
    const data = await response.json();

    if (response.ok && data.documents_by_category) {
      const hasIR =
        data.documents_by_category[CompanyDocumentCategory.IR_DECK] &&
        data.documents_by_category[CompanyDocumentCategory.IR_DECK].length > 0;
      const hasInvestmentReport =
        data.documents_by_category[CompanyDocumentCategory.INVESTMENT_REPORT] &&
        data.documents_by_category[CompanyDocumentCategory.INVESTMENT_REPORT]
          .length > 0;

      return { hasIR, hasInvestmentReport };
    }
    return { hasIR: false, hasInvestmentReport: false };
  } catch (err) {
    console.error(`문서 유무 확인 실패 (회사 ID: ${companyId}):`, err);
    return { hasIR: false, hasInvestmentReport: false };
  }
};

// 모든 투자의 문서 유무 확인
const checkAllDocuments = async (
  fundId: string,
  investments: InvestmentWithDetails[]
): Promise<Record<string, DocumentAvailability>> => {
  const availability: Record<string, DocumentAvailability> = {};

  // 병렬로 모든 투자의 문서 유무 확인
  const promises = investments.map(async investment => {
    const result = await checkDocumentAvailability(
      fundId,
      investment.company_id
    );
    availability[investment.company_id] = result;
  });

  await Promise.all(promises);
  return availability;
};

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  fundPortfolios: {},

  getPortfolioData: (fundId: string) => {
    const { fundPortfolios } = get();
    return fundPortfolios[fundId] || createInitialFundPortfolioData();
  },

  shouldRefetch: (fundId: string, maxAgeMs: number = 5 * 60 * 1000) => {
    const portfolioData = get().getPortfolioData(fundId);
    const now = Date.now();

    // 데이터가 없거나, 설정된 시간보다 오래된 경우 다시 fetch
    return (
      !portfolioData.portfolio || now - portfolioData.lastFetchedAt > maxAgeMs
    );
  },

  loadPortfolio: async (fundId: string) => {
    const state = get();

    // 이미 로딩 중이거나 최근에 로드한 경우 중복 요청 방지
    const currentData = state.getPortfolioData(fundId);
    if (currentData.loading) {
      console.log(
        `[PortfolioStore] Portfolio already loading for fund ${fundId}`
      );
      return;
    }

    // 최근 5분 이내에 로드한 경우 캐시된 데이터 사용
    if (!state.shouldRefetch(fundId)) {
      console.log(
        `[PortfolioStore] Using cached portfolio data for fund ${fundId}`
      );
      return;
    }

    try {
      state.setLoading(fundId, true);
      state.setError(fundId, null);

      console.log(
        `[PortfolioStore] Fetching portfolio data for fund ${fundId}`
      );

      const response = await fetch(`/api/funds/${fundId}/portfolio`);
      const data = await response.json();

      if (response.ok) {
        state.setPortfolio(fundId, data);

        // 포트폴리오 로드 후 문서 유무 확인
        if (data.investments && data.investments.length > 0) {
          const documentAvailability = await checkAllDocuments(
            fundId,
            data.investments
          );
          state.setDocumentAvailability(fundId, documentAvailability);
        }

        console.log(
          `[PortfolioStore] Successfully loaded portfolio for fund ${fundId}`
        );
      } else {
        state.setError(
          fundId,
          data.error || '포트폴리오를 불러오는데 실패했습니다'
        );
      }
    } catch (err) {
      console.error(
        `[PortfolioStore] Failed to load portfolio for fund ${fundId}:`,
        err
      );
      state.setError(fundId, '네트워크 오류가 발생했습니다');
    } finally {
      state.setLoading(fundId, false);
    }
  },

  setLoading: (fundId: string, loading: boolean) => {
    set(state => {
      const previous =
        state.fundPortfolios[fundId] || createInitialFundPortfolioData();
      return {
        fundPortfolios: {
          ...state.fundPortfolios,
          [fundId]: {
            ...previous,
            loading,
          },
        },
      };
    });
  },

  setError: (fundId: string, error: string | null) => {
    set(state => {
      const previous =
        state.fundPortfolios[fundId] || createInitialFundPortfolioData();
      return {
        fundPortfolios: {
          ...state.fundPortfolios,
          [fundId]: {
            ...previous,
            error,
          },
        },
      };
    });
  },

  setPortfolio: (fundId: string, portfolio: PortfolioData) => {
    set(state => {
      const previous =
        state.fundPortfolios[fundId] || createInitialFundPortfolioData();
      return {
        fundPortfolios: {
          ...state.fundPortfolios,
          [fundId]: {
            ...previous,
            portfolio,
            error: null,
            lastFetchedAt: Date.now(),
          },
        },
      };
    });
  },

  setDocumentAvailability: (
    fundId: string,
    availability: Record<string, DocumentAvailability>
  ) => {
    set(state => {
      const previous =
        state.fundPortfolios[fundId] || createInitialFundPortfolioData();
      return {
        fundPortfolios: {
          ...state.fundPortfolios,
          [fundId]: {
            ...previous,
            documentAvailability: availability,
          },
        },
      };
    });
  },

  clearPortfolio: (fundId: string) => {
    set(state => {
      const newFundPortfolios = { ...state.fundPortfolios };
      delete newFundPortfolios[fundId];
      return {
        fundPortfolios: newFundPortfolios,
      };
    });
  },
}));
