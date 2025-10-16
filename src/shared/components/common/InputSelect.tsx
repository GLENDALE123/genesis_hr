'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

interface InputSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  error?: boolean;
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
  error = false,
  disabled = false,
  autoComplete = "off",
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // 약간의 지연을 두어 이벤트 충돌 방지
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleOptionSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Input
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={cn(
            "pr-10",
            error && 'border-red-500',
            className
          )}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          autoComplete={autoComplete}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      
      {isOpen && (
        <div data-dropdown className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option) => (
            <div
              key={option}
              className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm flex items-center"
              onClick={() => handleOptionSelect(option)}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === option ? "opacity-100" : "opacity-0"
                )}
              />
              {option}
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              일치하는 항목이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
