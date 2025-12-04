import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  sidebarCollapsed: boolean;
}

interface GlobalState {
  preferences: Preferences;
  toggleSidebarCollapsed: () => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      preferences: {
        sidebarCollapsed: false,
      },
      toggleSidebarCollapsed: () => 
        set((state) => ({ 
          preferences: { 
            ...state.preferences, 
            sidebarCollapsed: !state.preferences.sidebarCollapsed 
          } 
        })),
      updatePreferences: (prefs) => 
        set((state) => ({ 
          preferences: { ...state.preferences, ...prefs } 
        })),
    }),
    {
      name: 'global-store',
    }
  )
);







