/**
 * 포스트잇 위젯 (컨트롤 패널)
 * 사이드패널에서 포스트잇을 추가/관리하는 컨트롤
 * 실제 포스트잇은 PostItCanvas에서 전체 화면에 렌더링됨
 */

import React, { useState, useCallback, useRef } from 'react';
import { usePostIt } from '@/shared/hooks/usePostIt';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';
import { cn } from '@/shared/lib/utils';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { PostItColor } from '@/shared/types/postit.types';

export const PostItWidget: React.FC = () => {
  // Electron 환경이 아니면 렌더링하지 않음
  const isElectronEnv = typeof window !== 'undefined' && (window as any).__ELECTRON__ === true;

  // Electron 환경이 아니면 빈 컴포넌트 반환 (가장 먼저 체크)
  if (!isElectronEnv) {
    return null;
  }

  const { postits, createPostIt, bringToView, updatePostIt, removePostIt, createFolder } = usePostIt();
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // 포스트잇이 화면에 보이는지 체크 (visible 속성과 화면 위치 모두 체크)
  const isPostItVisible = useCallback((postit: typeof postits[0]) => {
    if (!postit || !postit.position || !postit.size) return false;
    // visible이 false면 보이지 않음
    if (postit.visible === false) return false;
    // 화면 위치 체크
    return (
      postit.position.x + postit.size.width >= 0 &&
      postit.position.x <= window.innerWidth &&
      postit.position.y + postit.size.height >= 0 &&
      postit.position.y <= window.innerHeight
    );
  }, []);

  const handleAdd = useCallback(() => {
    if (newContent.trim()) {
      const newPostIt = createPostIt(newContent.trim());
      setNewContent('');
      setIsAdding(false);
    }
  }, [newContent, createPostIt]);

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground">포스트잇</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={() => {
            setIsAdding(true);
            setNewContent('');
          }}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* 컨트롤 영역 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* 새 포스트잇 추가 */}
        {isAdding && (
          <div className="bg-yellow-200 rounded-md p-2 shadow-sm">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="메모를 입력하세요..."
              className="min-h-[60px] text-sm resize-none bg-transparent border-0 focus-visible:ring-0 p-0"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAdd();
                } else if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewContent('');
                }
              }}
            />
            <div className="flex items-center justify-end gap-1 mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs"
                onClick={() => {
                  setIsAdding(false);
                  setNewContent('');
                }}
              >
                취소
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs"
                onClick={handleAdd}
              >
                추가
              </Button>
            </div>
          </div>
        )}

        {/* 포스트잇 목록 */}
        {postits.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-muted-foreground mb-1">
              {postits.length}개의 포스트잇
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {postits.map((postit) => {
                  const visible = isPostItVisible(postit);
                  const isHidden = postit.visible === false;
                  const isDragged = draggedId === postit.id;
                  const isDragOver = dragOverId === postit.id;

                  return (
                    <ContextMenu key={postit.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          className={cn(
                            'text-xs p-2 rounded cursor-pointer transition-colors',
                            isHidden
                              ? 'bg-muted/20 hover:bg-muted/30 border border-dashed border-muted-foreground/20 opacity-60'
                              : visible
                                ? 'bg-muted/50 hover:bg-muted'
                                : 'bg-muted/30 hover:bg-muted/50 border border-dashed border-muted-foreground/30',
                            isDragged && 'opacity-50',
                            isDragOver && 'ring-2 ring-primary'
                          )}
                          draggable
                          onDragStart={(e) => {
                            setDraggedId(postit.id);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', postit.id);
                          }}
                          onDragOver={(e) => {
                            if (draggedId && draggedId !== postit.id) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverId(postit.id);
                            }
                          }}
                          onDragLeave={() => {
                            setDragOverId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const sourceId = e.dataTransfer.getData('text/plain');
                            if (sourceId && sourceId !== postit.id) {
                              // 두 포스트잇을 폴더로 묶기
                              createFolder(sourceId, postit.id).catch((error) => {
                                console.error('폴더 생성 실패:', error);
                              });
                            }
                            setDraggedId(null);
                            setDragOverId(null);
                          }}
                          onDragEnd={() => {
                            setDraggedId(null);
                            setDragOverId(null);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            // 클릭 시 포커스 및 보이기만 처리 (숨기기는 아이콘으로만)
                            if (!visible) {
                              updatePostIt(postit.id, { visible: true });
                            }

                            bringToView(postit.id);
                            // PostItCanvas에 포커스 이벤트 전달
                            setTimeout(() => {
                              window.dispatchEvent(
                                new CustomEvent('postit-focus', {
                                  detail: { id: postit.id },
                                  bubbles: true,
                                  cancelable: true
                                })
                              );
                            }, 100);
                          }}
                          title={postit.content || '(빈 포스트잇)'}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex-1 truncate">
                              {postit.content || '(빈 포스트잇)'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-black/10 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                const currentVisible = postit.visible !== false;
                                updatePostIt(postit.id, { visible: !currentVisible });
                              }}
                              onMouseDown={(e) => e.stopPropagation()} // 드래그 방지
                            >
                              {isHidden ? (
                                <EyeOff className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                              ) : visible ? (
                                <Eye className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <EyeOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            removePostIt(postit.id).catch((error) => {
                              console.error('포스트잇 삭제 실패:', error);
                            });
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          삭제
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* 빈 상태 */}
        {postits.length === 0 && !isAdding && (
          <div className="text-center text-xs text-muted-foreground py-4">
            포스트잇이 없습니다.
            <br />
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs mt-1"
              onClick={() => {
                setIsAdding(true);
                setNewContent('');
              }}
            >
              새 포스트잇 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
