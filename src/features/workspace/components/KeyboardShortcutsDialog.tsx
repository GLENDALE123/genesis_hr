/**
 * 키보드 단축키 도움말 다이얼로그
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { COMMON_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const formatShortcut = (shortcut: typeof COMMON_SHORTCUTS[keyof typeof COMMON_SHORTCUTS]) => {
    const parts: string[] = [];
    if ('ctrl' in shortcut && shortcut.ctrl) parts.push('Ctrl');
    if ('shift' in shortcut && shortcut.shift) parts.push('Shift');
    if ('alt' in shortcut && shortcut.alt) parts.push('Alt');
    if ('meta' in shortcut && shortcut.meta) parts.push('Cmd');
    parts.push(shortcut.key);
    return parts.join(' + ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>키보드 단축키</DialogTitle>
          <DialogDescription>
            워크스페이스에서 사용할 수 있는 키보드 단축키입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6 max-h-[500px] overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold mb-3">메시지</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.SEND_MESSAGE.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  {COMMON_SHORTCUTS.SEND_MESSAGE.key}
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.SEND_MESSAGE_NEW_LINE.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  Shift + {COMMON_SHORTCUTS.SEND_MESSAGE_NEW_LINE.key}
                </kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">네비게이션</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.SEARCH.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  Ctrl + {COMMON_SHORTCUTS.SEARCH.key}
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.NEXT_CHANNEL.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  Alt + {COMMON_SHORTCUTS.NEXT_CHANNEL.key}
                </kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.PREV_CHANNEL.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  Alt + {COMMON_SHORTCUTS.PREV_CHANNEL.key}
                </kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">기능</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                <span className="text-sm">{COMMON_SHORTCUTS.OPEN_THREAD.description}</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">
                  Ctrl + {COMMON_SHORTCUTS.OPEN_THREAD.key}
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

