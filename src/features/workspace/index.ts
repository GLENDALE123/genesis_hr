/**
 * 워크스페이스 피처 통합 export
 */

export * from './types';
export * from './store';
export * from './utils';
// 서비스와 컴포넌트는 명시적으로 export하여 중복 방지
export * from './services';
export { 
  WorkspaceSidebar,
  WorkspaceSettingsDialog,
  ChannelList,
  ChannelView,
  ChannelHeader,
  ChannelSearchDialog,
  ChannelNotificationSettings as ChannelNotificationSettingsComponent,
  ChannelInviteDialog,
  MessageEditHistoryDialog,
  MessageEditDialog,
  ThreadView,
  ReactionPicker,
  EmojiPicker,
  UserProfileCard,
  UrlPreview,
  KeyboardShortcutsDialog,
  UserCustomStatusDialog,
  WorkspaceMessagePage,
  ReportRequestDialog,
  ApprovalManagementPanel,
} from './components';
export type { ChannelNotificationSettingsProps } from './components';

