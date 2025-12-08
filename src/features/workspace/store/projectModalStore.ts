import { create } from 'zustand';

interface ProjectModalStore {
    isOpen: boolean;
    projectId: string | null;
    initialTab?: 'info' | 'issue';
    openProjectModal: (projectId: string, initialTab?: 'info' | 'issue') => void;
    closeProjectModal: () => void;
}

export const useProjectModalStore = create<ProjectModalStore>((set) => ({
    isOpen: false,
    projectId: null,
    initialTab: undefined,
    openProjectModal: (projectId, initialTab) => set({ isOpen: true, projectId, initialTab }),
    closeProjectModal: () => set({ isOpen: false, projectId: null, initialTab: undefined }),
}));
