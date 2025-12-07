/**
 * 워크스페이스 Zustand 스토어
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Workspace,
} from '../types';
import type { Channel } from '../channels';

interface WorkspaceState {
  // 현재 워크스페이스
  currentWorkspace: Workspace | null;
  // 워크스페이스 목록
  workspaces: Workspace[];
  // 현재 채널
  currentChannel: Channel | null;
  // 워크스페이스의 채널 목록
  channels: Record<string, Channel[]>; // workspaceId -> channels[]
  // 로딩 상태
  isLoadingWorkspaces: boolean;
  isLoadingChannels: boolean;
}

interface WorkspaceActions {
  // 워크스페이스 관련
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setWorkspaces: (workspaces: Workspace[] | ((prev: Workspace[]) => Workspace[])) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (workspaceId: string) => void;
  
  // 채널 관련
  setCurrentChannel: (channel: Channel | null) => void;
  setChannels: (workspaceId: string, channels: Channel[]) => void;
  addChannel: (workspaceId: string, channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (workspaceId: string, channelId: string) => void;
  
  // 로딩 상태
  setIsLoadingWorkspaces: (loading: boolean) => void;
  setIsLoadingChannels: (loading: boolean) => void;
  
  // 전체 초기화
  reset: () => void;
}

const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
  currentChannel: null,
  channels: {},
  isLoadingWorkspaces: false,
  isLoadingChannels: false,
};

type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // 워크스페이스 관련
        setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
        setWorkspaces: (workspaces) => set((state) => ({
          workspaces: typeof workspaces === 'function' ? workspaces(state.workspaces) : workspaces
        })),
        addWorkspace: (workspace) =>
          set((state) => ({
            workspaces: [...state.workspaces, workspace],
          })),
        updateWorkspace: (workspaceId, updates) =>
          set((state) => ({
            workspaces: state.workspaces.map((w) =>
              w.id === workspaceId ? { ...w, ...updates } : w
            ),
            currentWorkspace:
              state.currentWorkspace?.id === workspaceId
                ? { ...state.currentWorkspace, ...updates }
                : state.currentWorkspace,
          })),
        removeWorkspace: (workspaceId) =>
          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
            currentWorkspace:
              state.currentWorkspace?.id === workspaceId ? null : state.currentWorkspace,
            channels: Object.fromEntries(
              Object.entries(state.channels).filter(([id]) => id !== workspaceId)
            ),
          })),

        // 채널 관련
        setCurrentChannel: (channel) => set({ currentChannel: channel }),
        setChannels: (workspaceId, channels) =>
          set((state) => ({
            channels: {
              ...state.channels,
              [workspaceId]: channels,
            },
          })),
        addChannel: (workspaceId, channel) =>
          set((state) => ({
            channels: {
              ...state.channels,
              [workspaceId]: [...(state.channels[workspaceId] || []), channel],
            },
          })),
        updateChannel: (channelId, updates) =>
          set((state) => {
            const updatedChannels: Record<string, Channel[]> = {};
            Object.entries(state.channels).forEach(([wsId, channels]) => {
              updatedChannels[wsId] = channels.map((c) =>
                c.id === channelId ? { ...c, ...updates } : c
              );
            });
            return {
              channels: updatedChannels,
              currentChannel:
                state.currentChannel?.id === channelId
                  ? { ...state.currentChannel, ...updates }
                  : state.currentChannel,
            };
          }),
        removeChannel: (workspaceId, channelId) =>
          set((state) => ({
            channels: {
              ...state.channels,
              [workspaceId]: (state.channels[workspaceId] || []).filter(
                (c) => c.id !== channelId
              ),
            },
            currentChannel:
              state.currentChannel?.id === channelId ? null : state.currentChannel,
          })),

        // 로딩 상태
        setIsLoadingWorkspaces: (loading) => set({ isLoadingWorkspaces: loading }),
        setIsLoadingChannels: (loading) => set({ isLoadingChannels: loading }),

        // 전체 초기화
        reset: () => set(initialState),
      }),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          currentWorkspace: state.currentWorkspace,
          currentChannel: state.currentChannel,
        }),
      }
    ),
    { name: 'WorkspaceStore' }
  )
);

