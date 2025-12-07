/**
 * 워크스페이스 컴포넌트 통합 export
 */

export * from './WorkspaceSidebar';
export * from './WorkspaceSettingsDialog';
// Channel 관련 컴포넌트는 channels 서브모듈로 이동
// ChannelList, ChannelView, ChannelHeader, ChannelSearchDialog, ChannelNotificationSettings,
// ChannelInviteDialog, ChannelRightSidebar, ChannelSettingsDialog, ChannelMemberManagement,
// ChannelBoardView는 channels 서브모듈에서 export
// UserProfileCard와 UserCustomStatusDialog는 members 서브모듈로 이동
export * from './UrlPreview';
export * from './KeyboardShortcutsDialog';
export * from './WorkspaceMessagePage';
// Approval 관련 컴포넌트는 approvals 서브모듈로 이동
// ReportRequestDialog, ApprovalManagementPanel, ReimbursementAdvanceManagementPanel,
// ReimbursementAdvanceRequestDialog는 approvals 서브모듈에서 export
