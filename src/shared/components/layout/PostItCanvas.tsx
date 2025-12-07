/**
 * 포스트잇 캔버스
 * 전체 화면 배경에 포스트잇을 렌더링하는 컴포넌트
 */

import React, { useState, useRef, useCallback } from 'react';
import { usePostIt } from '@/shared/hooks/usePostIt';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { X, MoreVertical, Palette, Plus, Bold, Italic, Underline, Strikethrough, List, Image as ImageIcon } from 'lucide-react';
import type { PostIt, PostItColor } from '@/shared/types/postit.types';

const POSTIT_COLORS: { value: PostItColor; label: string; bgClass: string }[] = [
  { value: 'yellow', label: '노란색', bgClass: 'bg-yellow-200' },
  { value: 'blue', label: '파란색', bgClass: 'bg-blue-200' },
  { value: 'pink', label: '분홍색', bgClass: 'bg-pink-200' },
  { value: 'green', label: '초록색', bgClass: 'bg-green-200' },
  { value: 'purple', label: '보라색', bgClass: 'bg-purple-200' },
];

const MIN_WIDTH = 150;
const MIN_HEIGHT = 150;

interface PostItItemProps {
  postit: PostIt;
  onUpdate: (id: string, updates: Partial<PostIt>) => Promise<PostIt | null>;
  onDelete: (id: string) => Promise<boolean>;
  onFocus: (id: string) => void;
  isFocused: boolean;
  onCreateNew?: () => void; // 새 메모 생성 콜백
}

const PostItItem: React.FC<PostItItemProps> = ({
  postit,
  onUpdate,
  onDelete,
  onFocus,
  isFocused,
  onCreateNew,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  // 드래그/리사이즈 중 임시 위치/크기 (UI 즉시 반영용)
  const [tempPosition, setTempPosition] = useState<{ x: number; y: number } | null>(null);
  const [tempSize, setTempSize] = useState<{ width: number; height: number } | null>(null);
  const postitRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isMouseMovingRef = useRef<boolean>(false);
  const hasMovedRef = useRef<boolean>(false);
  const lastSavedContentRef = useRef<string>(postit.content || '');
  const updatePositionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateSizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPositionRef = useRef<{ x: number; y: number } | null>(postit.position || null);
  const lastSavedSizeRef = useRef<{ width: number; height: number } | null>(postit.size || null);
  
  // 드래그로 인식할 최소 이동 거리 (픽셀)
  const DRAG_THRESHOLD = 5;

  const colorConfig = POSTIT_COLORS.find((c) => c.value === postit.color) || POSTIT_COLORS[0];

  // 드래그 시작 (지연을 두어 클릭과 드래그 구분)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 드래그 불가능한 요소 체크 - 가장 먼저 체크하여 즉시 반환
    if (target.closest('button')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-dropdown-menu-trigger]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('.resize-handle')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('textarea')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[role="menuitem"]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[role="menu"]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-popper-content-wrapper]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-dropdown-menu-content]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-dropdown-menu-item]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-dropdown-menu-sub-trigger]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-dropdown-menu-sub-content]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-state]')) {
      e.stopPropagation();
      return;
    }
    if (target.closest('[data-radix-portal]')) {
      e.stopPropagation();
      return;
    }
    
    // SVG 아이콘도 체크
    if (target.closest('svg') && target.closest('button')) {
      e.stopPropagation();
      return;
    }
    
    // 텍스트 선택 중이면 드래그 방지
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    
    // 마우스 다운 위치와 시간 저장
    mouseDownPosRef.current = { 
      x: e.clientX, 
      y: e.clientY,
      time: Date.now()
    };
    hasMovedRef.current = false;
    isMouseMovingRef.current = false;
    
    // 마우스 이동 감지를 위한 전역 리스너 등록
    const handleMouseMoveForDrag = (moveEvent: MouseEvent) => {
      if (!mouseDownPosRef.current) return;
      
      const deltaX = Math.abs(moveEvent.clientX - mouseDownPosRef.current.x);
      const deltaY = Math.abs(moveEvent.clientY - mouseDownPosRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 드래그 임계값을 넘으면 드래그 시작
      if (distance > DRAG_THRESHOLD) {
        hasMovedRef.current = true;
        isMouseMovingRef.current = true;
        
        // 드래그 타임아웃 취소
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
        }
        
        // 드래그 시작
        if (postit.position) {
          setIsDragging(true);
          setDragStart({
            x: moveEvent.clientX - (postit.position.x ?? 50),
            y: moveEvent.clientY - (postit.position.y ?? 50),
          });
          onFocus(postit.id);
          
          // 텍스트 선택 방지
          if (contentEditableRef.current) {
            contentEditableRef.current.style.userSelect = 'none';
            contentEditableRef.current.style.pointerEvents = 'none';
          }
        }
        
        // 전역 리스너 제거 (이제 handleMouseMove가 처리)
        document.removeEventListener('mousemove', handleMouseMoveForDrag);
        mouseDownPosRef.current = null;
      }
    };
    
    // 전역 마우스 이동 리스너 등록
    document.addEventListener('mousemove', handleMouseMoveForDrag);
    
    // 일정 시간 후 전역 리스너 제거 (마우스가 움직이지 않았을 경우)
    dragTimeoutRef.current = setTimeout(() => {
      document.removeEventListener('mousemove', handleMouseMoveForDrag);
      if (!hasMovedRef.current) {
        mouseDownPosRef.current = null;
      }
    }, 200);
    
    e.stopPropagation();
  }, [postit.position, postit.id, onFocus]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && postit.size) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // 화면 경계 체크
      const maxX = window.innerWidth - (postit.size.width ?? 200);
      const maxY = window.innerHeight - (postit.size.height ?? 200);
      
      const newPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };
      
      // UI 즉시 업데이트 (임시 상태 사용)
      setTempPosition(newPosition);
      
      // 저장은 디바운싱 (300ms마다)
      if (updatePositionTimeoutRef.current) {
        clearTimeout(updatePositionTimeoutRef.current);
      }
      
      // 마지막 저장 위치와 다를 때만 저장 (10px 이상 차이)
      const shouldSave = !lastSavedPositionRef.current ||
        Math.abs(lastSavedPositionRef.current.x - newPosition.x) > 10 ||
        Math.abs(lastSavedPositionRef.current.y - newPosition.y) > 10;
      
      if (shouldSave) {
        updatePositionTimeoutRef.current = setTimeout(() => {
          onUpdate(postit.id, {
            position: newPosition,
          }).then(() => {
            lastSavedPositionRef.current = newPosition;
          }).catch((error) => {
            console.error('포스트잇 위치 업데이트 실패:', error);
          });
        }, 300);
      }
    } else if (isResizing && postit.position) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
      const newHeight = Math.max(MIN_HEIGHT, resizeStart.height + deltaY);
      
      // 화면 경계 체크
      const maxWidth = window.innerWidth - (postit.position.x ?? 50);
      const maxHeight = window.innerHeight - (postit.position.y ?? 50);
      
      const newSize = {
        width: Math.min(newWidth, maxWidth),
        height: Math.min(newHeight, maxHeight),
      };
      
      // UI 즉시 업데이트 (임시 상태 사용)
      setTempSize(newSize);
      
      // 리사이즈 중에도 디바운싱
      if (updateSizeTimeoutRef.current) {
        clearTimeout(updateSizeTimeoutRef.current);
      }
      
      // 마지막 저장 크기와 다를 때만 저장 (10px 이상 차이)
      const shouldSave = !lastSavedSizeRef.current ||
        Math.abs(lastSavedSizeRef.current.width - newSize.width) > 10 ||
        Math.abs(lastSavedSizeRef.current.height - newSize.height) > 10;
      
      if (shouldSave) {
        updateSizeTimeoutRef.current = setTimeout(() => {
          onUpdate(postit.id, {
            size: newSize,
          }).then(() => {
            lastSavedSizeRef.current = newSize;
          }).catch((error) => {
            console.error('포스트잇 크기 업데이트 실패:', error);
          });
        }, 300);
      }
    }
  }, [isDragging, isResizing, dragStart, resizeStart, postit, onUpdate]);

  // 드래그/리사이즈 종료
  const handleMouseUp = useCallback(async () => {
    // 드래그 타임아웃 취소
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = null;
    }
    
    // 드래그 종료 시 대기 중인 업데이트 취소하고 즉시 최종 위치 저장
    if (isDragging) {
      if (updatePositionTimeoutRef.current) {
        clearTimeout(updatePositionTimeoutRef.current);
        updatePositionTimeoutRef.current = null;
      }
      
      // 임시 위치가 있으면 최종 위치로 저장
      const finalPosition = tempPosition || postit.position;
      if (finalPosition) {
        await onUpdate(postit.id, {
          position: finalPosition,
        }).then(() => {
          lastSavedPositionRef.current = finalPosition;
          setTempPosition(null); // 임시 위치 초기화
        }).catch((error) => {
          console.error('포스트잇 최종 위치 저장 실패:', error);
        });
      }
    }
    
    // 리사이즈 종료 시 대기 중인 업데이트 취소하고 즉시 최종 크기 저장
    if (isResizing) {
      if (updateSizeTimeoutRef.current) {
        clearTimeout(updateSizeTimeoutRef.current);
        updateSizeTimeoutRef.current = null;
      }
      
      // 임시 크기가 있으면 최종 크기로 저장
      const finalSize = tempSize || postit.size;
      if (finalSize) {
        await onUpdate(postit.id, {
          size: finalSize,
        }).then(() => {
          lastSavedSizeRef.current = finalSize;
          setTempSize(null); // 임시 크기 초기화
        }).catch((error) => {
          console.error('포스트잇 최종 크기 저장 실패:', error);
        });
      }
    }
    
    // 마우스 다운 위치 초기화
    mouseDownPosRef.current = null;
    hasMovedRef.current = false;
    isMouseMovingRef.current = false;
    setIsDragging(false);
    setIsResizing(false);
  }, [isDragging, isResizing, tempPosition, tempSize, postit, onUpdate, onFocus, postit.id]);

  // 리사이즈 시작
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!postit.size) return;
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: postit.size.width ?? 200,
      height: postit.size.height ?? 200,
    });
    // 리사이즈 시작 시 임시 크기 초기화
    setTempSize(null);
    onFocus(postit.id);
  }, [postit.size, onFocus, postit.id]);

  // 전역 마우스 이벤트
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // 컴포넌트 언마운트 시 타임아웃 정리
  React.useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      if (updatePositionTimeoutRef.current) {
        clearTimeout(updatePositionTimeoutRef.current);
      }
      if (updateSizeTimeoutRef.current) {
        clearTimeout(updateSizeTimeoutRef.current);
      }
    };
  }, []);

  // 편집 저장 (blur 시)
  const handleSaveEdit = useCallback(async () => {
    if (contentEditableRef.current) {
      let htmlContent = contentEditableRef.current.innerHTML;
      // 빈 내용 정규화
      if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<br>' || htmlContent === '<p><br></p>' || htmlContent === '<div><br></div>') {
        htmlContent = '';
      }
      if (htmlContent !== lastSavedContentRef.current) {
        lastSavedContentRef.current = htmlContent;
        await onUpdate(postit.id, { content: htmlContent });
      }
    }
  }, [postit.id, onUpdate]);

  // 색상 변경
  const handleChangeColor = useCallback(async (color: PostItColor) => {
    await onUpdate(postit.id, { color });
  }, [postit.id, onUpdate]);

  // contentEditable 초기화 및 내용 동기화
  React.useEffect(() => {
    if (contentEditableRef.current) {
      // 포스트잇 내용이 변경되었을 때만 업데이트 (사용자가 편집 중이 아닐 때)
      const currentContent = contentEditableRef.current.innerHTML;
      const newContent = postit.content || '';
      
      // 내용이 다르고, 사용자가 편집 중이 아니거나 포커스가 없을 때만 업데이트
      if (currentContent !== newContent && document.activeElement !== contentEditableRef.current) {
        // 빈 내용이면 빈 문자열로 설정 (플레이스홀더 표시를 위해)
        if (!newContent || newContent.trim() === '' || newContent === '<br>' || newContent === '<p><br></p>' || newContent === '<div><br></div>') {
          contentEditableRef.current.innerHTML = '';
        } else {
          contentEditableRef.current.innerHTML = newContent;
        }
        lastSavedContentRef.current = newContent || '';
      }
    }
  }, [postit.content]);
  
  // 포스트잇 위치/크기가 업데이트될 때 임시 상태 동기화 (드래그/리사이즈 중이 아닐 때만)
  React.useEffect(() => {
    if (!isDragging && !isResizing) {
      // 드래그/리사이즈가 끝나면 임시 상태 초기화
      if (tempPosition) {
        setTempPosition(null);
      }
      if (tempSize) {
        setTempSize(null);
      }
      // 마지막 저장 위치/크기 동기화
      if (postit.position) {
        lastSavedPositionRef.current = postit.position;
      }
      if (postit.size) {
        lastSavedSizeRef.current = postit.size;
      }
    }
  }, [postit.position, postit.size, isDragging, isResizing, tempPosition, tempSize]);

  // 텍스트 서식 적용
  const handleFormatText = useCallback((command: string, value?: string) => {
    if (!contentEditableRef.current) return;
    
    // contentEditable에 포커스가 없으면 포커스 설정
    if (document.activeElement !== contentEditableRef.current) {
      contentEditableRef.current.focus();
    }
    
    // document.execCommand 사용 (브라우저 호환성)
    document.execCommand(command, false, value);
    
    // 자동 저장 (디바운스)
    if (contentEditableRef.current) {
      let htmlContent = contentEditableRef.current.innerHTML;
      // 빈 내용 정규화
      if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<br>' || htmlContent === '<p><br></p>' || htmlContent === '<div><br></div>') {
        htmlContent = '';
      }
      onUpdate(postit.id, { content: htmlContent }).catch((error) => {
        console.error('포스트잇 내용 업데이트 실패:', error);
      });
    }
  }, [postit.id, onUpdate]);

  // 이미지 삽입
  const handleInsertImage = useCallback(() => {
    if (!contentEditableRef.current) return;
    
    // 파일 입력 요소 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // FileReader로 이미지를 Data URL로 변환
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (contentEditableRef.current && dataUrl) {
          // contentEditable에 포커스
          contentEditableRef.current.focus();
          
          // 이미지 삽입
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          
          // 현재 선택 위치에 이미지 삽입
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.insertNode(img);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            contentEditableRef.current.appendChild(img);
          }
          
          // 자동 저장
          let htmlContent = contentEditableRef.current.innerHTML;
          // 빈 내용 정규화
          if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<br>' || htmlContent === '<p><br></p>' || htmlContent === '<div><br></div>') {
            htmlContent = '';
          }
          onUpdate(postit.id, { content: htmlContent }).catch((error) => {
            console.error('포스트잇 이미지 삽입 실패:', error);
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [postit.id, onUpdate]);


  return (
    <div
      ref={postitRef}
      className={cn(
        'fixed rounded-md shadow-lg cursor-move select-none',
        colorConfig.bgClass,
        isFocused && 'ring-2 ring-primary ring-offset-2',
        isDragging && 'opacity-90'
      )}
      style={{
        left: `${(tempPosition || postit.position)?.x ?? 50}px`,
        top: `${(tempPosition || postit.position)?.y ?? 50}px`,
        width: `${(tempSize || postit.size)?.width ?? 200}px`,
        height: `${(tempSize || postit.size)?.height ?? 200}px`,
        zIndex: 1000 + (postit.zIndex ?? 0), // 다른 UI 요소 위에 표시
      }}
    >
      {/* 헤더 (Windows Sticky Notes 스타일) */}
      <div 
        className={cn(
          "flex items-center justify-between px-2 py-1.5 border-b border-black/10",
          // 헤더 배경색이 메모 본문보다 살짝 진함
          postit.color === 'yellow' && 'bg-yellow-300/50',
          postit.color === 'blue' && 'bg-blue-300/50',
          postit.color === 'pink' && 'bg-pink-300/50',
          postit.color === 'green' && 'bg-green-300/50',
          postit.color === 'purple' && 'bg-purple-300/50',
        )}
        onMouseDown={handleMouseDown}
      >
        {/* 좌측: 새 메모 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded bg-white/60 hover:bg-white/80 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onCreateNew?.();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            mouseDownPosRef.current = null;
          }}
        >
          <Plus className="h-3.5 w-3.5 text-black/70" />
        </Button>
        
        {/* 중앙: 드래그 영역 (빈 공간) */}
        <div 
          className={cn(
            "flex-1 h-full",
            isDragging ? "cursor-grabbing" : "cursor-move"
          )}
          onMouseDown={handleMouseDown}
        />
        
        {/* 우측: 더 보기 버튼, 닫기 버튼 */}
        <div
          className="relative z-10 flex-shrink-0 flex items-center gap-0.5"
          style={{ pointerEvents: 'auto' }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            mouseDownPosRef.current = null;
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {/* 더 보기 버튼 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 relative z-20 hover:bg-white/40 rounded"
                style={{ pointerEvents: 'auto' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (dragTimeoutRef.current) {
                    clearTimeout(dragTimeoutRef.current);
                    dragTimeoutRef.current = null;
                  }
                  mouseDownPosRef.current = null;
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragTimeoutRef.current) {
                    clearTimeout(dragTimeoutRef.current);
                    dragTimeoutRef.current = null;
                  }
                  mouseDownPosRef.current = null;
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (dragTimeoutRef.current) {
                    clearTimeout(dragTimeoutRef.current);
                    dragTimeoutRef.current = null;
                  }
                  mouseDownPosRef.current = null;
                }}
                type="button"
              >
                <MoreVertical className="h-3.5 w-3.5 text-black/70" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-40"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Palette className="h-3 w-3 mr-2" />
                  색상 변경
                </DropdownMenuItem>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="left"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {POSTIT_COLORS.map((color) => (
                  <DropdownMenuItem
                    key={color.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangeColor(color.value);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={cn(
                      postit.color === color.value && 'bg-accent'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded mr-2',
                        color.bgClass
                      )}
                    />
                    {color.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenuItem
              onClick={async (e) => {
                e.stopPropagation();
                await onDelete(postit.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="text-destructive"
            >
              <X className="h-3 w-3 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* 닫기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-white/40 rounded"
          onClick={async (e) => {
            e.stopPropagation();
            await onDelete(postit.id);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            mouseDownPosRef.current = null;
          }}
          type="button"
        >
          <X className="h-3.5 w-3.5 text-black/70" />
        </Button>
        </div>
      </div>

      {/* 내용 영역 (Windows Sticky Notes 스타일) */}
      <div 
        className="flex flex-col h-[calc(100%-32px-40px)] min-h-0"
        onMouseDown={(e) => {
          // 콘텐츠 영역에서는 드래그를 시작하지 않고, 클릭만 처리
          // 드래그는 헤더 영역에서만 가능
          const target = e.target as HTMLElement;
          
          // contentEditable 영역이면 드래그 완전 차단
          if (target === contentEditableRef.current || target.closest('.content-editable') || target.closest('.formatting-toolbar')) {
            // 텍스트 편집 영역이면 드래그 방지
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            mouseDownPosRef.current = null;
            hasMovedRef.current = false;
            return;
          }
          
          // 그 외 영역(콘텐츠 영역의 빈 공간)에서는 드래그 허용
          handleMouseDown(e);
        }}
      >
        {/* 편집 가능한 콘텐츠 영역 */}
        <div
          ref={contentEditableRef}
          contentEditable
          className={cn(
            "content-editable flex-1 p-3 text-sm overflow-y-auto outline-none relative",
            "whitespace-pre-wrap break-words",
            "focus:outline-none",
            "cursor-text"
          )}
          data-placeholder="메모를 작성하세요..."
          style={{
            minHeight: '100px',
            userSelect: 'text',
          }}
          onMouseDown={(e) => {
            // contentEditable 영역에서는 드래그 완전 차단
            e.stopPropagation();
            if (dragTimeoutRef.current) {
              clearTimeout(dragTimeoutRef.current);
              dragTimeoutRef.current = null;
            }
            mouseDownPosRef.current = null;
            hasMovedRef.current = false;
            
            // 포커스 설정 (클릭 시)
            onFocus(postit.id);
          }}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            // Ctrl+B, Ctrl+I, Ctrl+U 등 단축키 지원
            if (e.ctrlKey || e.metaKey) {
              if (e.key === 'b') {
                e.preventDefault();
                handleFormatText('bold');
              } else if (e.key === 'i') {
                e.preventDefault();
                handleFormatText('italic');
              } else if (e.key === 'u') {
                e.preventDefault();
                handleFormatText('underline');
              } else if (e.key === 't') {
                e.preventDefault();
                handleFormatText('strikeThrough');
              } else if (e.shiftKey && e.key === 'L') {
                e.preventDefault();
                handleFormatText('insertUnorderedList');
              }
            }
          }}
          onInput={() => {
            // 입력 시 자동 저장 (디바운스)
            if (contentEditableRef.current) {
              const htmlContent = contentEditableRef.current.innerHTML;
              if (htmlContent !== lastSavedContentRef.current) {
                lastSavedContentRef.current = htmlContent;
                // 디바운스 적용 (500ms)
                setTimeout(() => {
                  if (contentEditableRef.current) {
                    const currentContent = contentEditableRef.current.innerHTML;
                    if (currentContent === htmlContent) {
                      onUpdate(postit.id, { content: htmlContent }).catch((error) => {
                        console.error('포스트잇 내용 업데이트 실패:', error);
                      });
                    }
                  }
                }, 500);
              }
            }
          }}
          suppressContentEditableWarning
        />
        
        {/* 하단 서식 도구 모음 (Windows Sticky Notes 스타일) */}
        <div className="formatting-toolbar flex items-center gap-1 px-2 py-1.5 border-t border-black/10">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleFormatText('bold');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="굵게 (Ctrl+B)"
          >
            <Bold className="h-3.5 w-3.5 text-black/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleFormatText('italic');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="기울임 (Ctrl+I)"
          >
            <Italic className="h-3.5 w-3.5 text-black/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleFormatText('underline');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="밑줄 (Ctrl+U)"
          >
            <Underline className="h-3.5 w-3.5 text-black/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleFormatText('strikeThrough');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="취소선 (Ctrl+T)"
          >
            <Strikethrough className="h-3.5 w-3.5 text-black/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleFormatText('insertUnorderedList');
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="목록 (Ctrl+Shift+L)"
          >
            <List className="h-3.5 w-3.5 text-black/70" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-black/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              handleInsertImage();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="이미지 추가"
          >
            <ImageIcon className="h-3.5 w-3.5 text-black/70" />
          </Button>
        </div>
      </div>

      {/* 리사이즈 핸들 */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-black/10 hover:bg-black/20 rounded-tl-md"
        onMouseDown={handleResizeStart}
        style={{
          backgroundImage: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.2) 50%, transparent 50%, transparent 100%)',
        }}
      />
    </div>
  );
};

export const PostItCanvas: React.FC = () => {
  console.log('[OK] [PostItCanvas] 컴포넌트 마운트됨');
  
  // Electron 환경이 아니면 렌더링하지 않음
  const isElectronEnv = typeof window !== 'undefined' && 
    ((window as any).__ELECTRON__ === true || (window as any).electron);
  
  // Electron 환경이 아니면 빈 컴포넌트 반환 (가장 먼저 체크)
  if (!isElectronEnv) {
    console.warn('[WARN] [PostItCanvas] Electron 환경이 아님, 렌더링하지 않음');
    return null;
  }
  
  console.log('[OK] [PostItCanvas] Electron 환경 확인됨, 포스트잇 로드 시작');
  
  const { postits, updatePostIt, removePostIt, bringToView, createPostIt } = usePostIt();
  
  console.log('[OK] [PostItCanvas] 포스트잇 개수:', postits.length);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // 새 메모 생성 핸들러
  const handleCreateNew = useCallback(async () => {
    await createPostIt('', 'yellow');
  }, [createPostIt]);

  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
    // zIndex 업데이트 (맨 앞으로)
    const postit = postits.find(p => p.id === id);
    if (postit) {
      const maxZIndex = Math.max(...postits.map(p => p.zIndex || 0));
      if (postit.zIndex < maxZIndex) {
        updatePostIt(id, { zIndex: maxZIndex + 1 }).catch((error) => {
          console.error('포스트잇 zIndex 업데이트 실패:', error);
        });
      }
    }
  }, [postits, updatePostIt]);

  // 외부에서 포스트잇을 보이도록 요청할 때 (PostItWidget에서 호출)
  React.useEffect(() => {
    const handlePostItFocus = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (customEvent.detail && customEvent.detail.id) {
        const { id } = customEvent.detail;
          bringToView(id).catch((error) => {
            console.error('포스트잇 bringToView 실패:', error);
          });
          handleFocus(id);
      }
    };

    window.addEventListener('postit-focus', handlePostItFocus);
    return () => {
      window.removeEventListener('postit-focus', handlePostItFocus);
    };
  }, [bringToView, handleFocus]);

  // visible이 false가 아닌 포스트잇만 필터링 (메모이제이션)
  const visiblePostits = React.useMemo(() => {
    return postits.filter((postit) => postit.visible !== false);
  }, [postits]);

  // 포스트잇이 없어도 컴포넌트는 항상 렌더링 (탭 전환 시 사라지지 않도록)
  console.log('[OK] [PostItCanvas] 렌더링 중, 표시할 포스트잇:', visiblePostits.length);
  
  return (
    <>
      {visiblePostits.length === 0 && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
        }}>
          <p style={{ margin: 0, color: '#333' }}>포스트잇이 없습니다. 새로 추가하려면 메인 앱에서 추가하세요.</p>
        </div>
      )}
      {visiblePostits.map((postit) => (
        <PostItItem
          key={postit.id}
          postit={postit}
          onUpdate={updatePostIt}
          onDelete={removePostIt}
          onFocus={handleFocus}
          isFocused={focusedId === postit.id}
          onCreateNew={handleCreateNew}
        />
      ))}
    </>
  );
};

