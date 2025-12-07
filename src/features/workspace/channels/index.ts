/**
 * Channels 서브모듈 진입점
 */

// Components
export { ChannelList } from './components/ChannelList';
export { ChannelView } from './components/ChannelView';
export { ChannelHeader } from './components/ChannelHeader';
export { ChannelSettingsDialog } from './components/ChannelSettingsDialog';
export { ChannelInviteDialog } from './components/ChannelInviteDialog';
export { ChannelSearchDialog } from './components/ChannelSearchDialog';
export { ChannelNotificationSettings as ChannelNotificationSettingsComponent } from './components/ChannelNotificationSettings';
export type { ChannelNotificationSettingsProps } from './components/ChannelNotificationSettings';
export { ChannelMemberManagement } from './components/ChannelMemberManagement';
export { ChannelRightSidebar } from './components/ChannelRightSidebar';
export { ChannelBoardView } from './components/ChannelBoardView';
export { DraggableChannelItem } from './components/DraggableChannelItem';

// Services
export { ChannelService } from './services/channelService';
export { ChannelSearchService } from './services/channelSearchService';
export type { SearchResult } from './services/channelSearchService';

// Types
export type {
  Channel,
  ChannelType,
  ChannelViewType,
  ChannelCategory,
  ChannelPermissions,
  CreateChannelData,
  UpdateChannelData,
  ChannelMemberUpdate,
} from './types/channel.types';

// Constants
export {
  DEFAULT_PUBLIC_CHANNEL_PERMISSIONS,
  DEFAULT_PRIVATE_CHANNEL_PERMISSIONS,
} from './types/channel.types';
