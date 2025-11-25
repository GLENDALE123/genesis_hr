import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  monthlyPayroll: number;
}

interface DashboardState {
  stats: DashboardStats;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface DashboardActions {
  fetchStats: () => Promise<void>;
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  refreshStats: () => Promise<void>;
}

const initialStats: DashboardStats = {
  totalEmployees: 0,
  activeEmployees: 0,
  totalPayroll: 0,
  monthlyPayroll: 0,
};

export const useDashboardStore = create<DashboardState & DashboardActions>()(
  devtools(
    (set, get) => ({
      // State
      stats: initialStats,
      isLoading: false,
      error: null,
      lastUpdated: null,
      
      // Actions
      fetchStats: async () => {
        set({ isLoading: true, error: null });
        try {
          // 실제 API 호출은 별도 서비스에서 처리
          // 여기서는 상태 관리만 담당
          // 임시 데이터 (실제로는 API에서 가져옴)
          const mockStats: DashboardStats = {
            totalEmployees: 150,
            activeEmployees: 142,
            totalPayroll: 85000000,
            monthlyPayroll: 7500000,
          };
          
          set({ 
            stats: mockStats, 
            lastUpdated: new Date(),
            isLoading: false 
          });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '대시보드 데이터를 불러오는데 실패했습니다.',
            isLoading: false 
          });
        }
      },
      
      setStats: (stats: DashboardStats) => set({ stats }),
      
      setLoading: (isLoading: boolean) => set({ isLoading }),
      
      setError: (error: string | null) => set({ error }),
      
      refreshStats: async () => {
        await get().fetchStats();
      },
    }),
    { name: 'dashboard-store' }
  )
);
