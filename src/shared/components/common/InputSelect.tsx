'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

// 전역 상태로 열린 InputSelect 관리
let openInputSelectId: string | null = null;
const inputSelectInstances = new Map<string, () => void>();

// 전역 함수: 다른 InputSelect가 열릴 때 기존 것 닫기
const closeOtherInputSelects = (currentId: string) => {
  if (openInputSelectId && openInputSelectId !== currentId) {
    const closeFunction = inputSelectInstances.get(openInputSelectId);
    if (closeFunction) {
      closeFunction();
    }
  }
  openInputSelectId = currentId;
};

// 전역 함수: InputSelect 닫기
const closeInputSelect = (id: string) => {
  if (openInputSelectId === id) {
    openInputSelectId = null;
  }
};

interface InputSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  'data-testid'?: string;
}

export const InputSelect: React.FC<InputSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "입력하거나 선택하세요",
  className,
  disabled = false,
  autoComplete = "off",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSelecting, setIsSelecting] = useState(false); // 선택 중인지 추적
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 고유 ID 생성
  const instanceId = useRef(`input-select-${Math.random().toString(36).substr(2, 9)}`).current;

  // 컴포넌트 마운트/언마운트 시 전역 상태 관리
  useEffect(() => {
    const closeFunction = () => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    };
    
    inputSelectInstances.set(instanceId, closeFunction);
    
    return () => {
      inputSelectInstances.delete(instanceId);
      closeInputSelect(instanceId);
    };
  }, [instanceId]);

  // 외부 클릭 시 드롭다운 닫기 및 스크롤 시 위치 업데이트
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (containerRef.current && !containerRef.current.contains(target) && 
          !target.closest('[data-dropdown]')) {
        setIsOpen(false);
        closeInputSelect(instanceId);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isOpen, instanceId]);

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // max-h-[300px]
      const spacing = 4;
      
      // 하단에 공간이 충분한지 확인
      const spaceBelow = viewportHeight - rect.bottom;
      
      let top = rect.bottom + spacing; // 기본적으로 하단에 배치
      
      // 하단 공간이 부족하면 항상 상단에 배치 (라벨 가려도 상관없음)
      if (spaceBelow < dropdownHeight) {
        top = rect.top - dropdownHeight - spacing;
      }
      
      setDropdownPosition({
        top,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleFocus = () => {
    // 선택 중이면 팝오버를 열지 않음
    if (isSelecting) {
      setIsSelecting(false);
      return;
    }
    // 다른 InputSelect가 열려있으면 닫기
    closeOtherInputSelects(instanceId);
    updateDropdownPosition();
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    setIsSelecting(true); // 선택 중 상태 설정
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    closeInputSelect(instanceId);
    // 선택 후 input에 포커스 유지하되, 팝오버가 다시 열리지 않도록 약간의 지연
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        // 다른 InputSelect가 열려있으면 닫기
        closeOtherInputSelects(instanceId);
        updateDropdownPosition();
        setIsOpen(true);
        setHighlightedIndex(-1);
      }
      return;
    }

    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes((value || '').toLowerCase())
    );

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        closeInputSelect(instanceId);
        inputRef.current?.blur();
        break;
      case 'Tab':
        // Tab 키로 팝오버 닫기
        setIsOpen(false);
        setHighlightedIndex(-1);
        closeInputSelect(instanceId);
        break;
    }
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes((value || '').toLowerCase())
  );

  // 드롭다운이 열릴 때 하이라이트 인덱스 초기화
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen, value]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value || ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            className
          )}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          list=""
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (!isOpen) {
              // 다른 InputSelect가 열려있으면 닫기
              closeOtherInputSelects(instanceId);
            }
            updateDropdownPosition();
            setIsOpen(!isOpen);
            if (!isOpen) {
              closeInputSelect(instanceId);
            }
          }}
          disabled={disabled}
          tabIndex={-1}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      
      {isOpen && createPortal(
        <div 
          data-dropdown 
          className="absolute max-h-[300px] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
          style={{
            position: 'absolute',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
            pointerEvents: 'auto',
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          onWheel={handleWheel}
        >
          <div className="p-1">
            {filteredOptions.map((option, index) => (
              <div
                key={option}
                className={cn(
                  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  index === highlightedIndex && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseLeave={() => setHighlightedIndex(-1)}
              >
                <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                </span>
                {option}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                일치하는 항목이 없습니다.
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
