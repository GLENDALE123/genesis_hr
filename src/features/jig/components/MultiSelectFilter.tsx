'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';

interface MultiSelectFilterProps {
  label: string;
  placeholder: string;
  options: string[];
  selectedValues: Set<string>;
  onSelectionChange: (values: Set<string>) => void;
  className?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  placeholder,
  options,
  selectedValues,
  onSelectionChange,
  className,
}) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    const newSelection = new Set(selectedValues);
    if (newSelection.has(value)) {
      newSelection.delete(value);
    } else {
      newSelection.add(value);
    }
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange(new Set());
  };

  const handleSelectAll = () => {
    onSelectionChange(new Set(options));
  };

  const getDisplayText = () => {
    if (selectedValues.size === 0) {
      return placeholder;
    }
    if (selectedValues.size === 1) {
      return Array.from(selectedValues)[0];
    }
    return `${selectedValues.size}개 선택됨`;
  };

  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-foreground">{label}</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-xs"
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={`${label} 검색...`} className="h-8" />
            <CommandList>
              <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              
              <CommandGroup>
                <CommandItem
                  onSelect={handleSelectAll}
                  className="text-primary font-medium text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      selectedValues.size === options.length ? "opacity-100" : "opacity-0"
                    )}
                  />
                  전체 선택
                </CommandItem>
                
                <CommandItem
                  onSelect={handleClearAll}
                  className="text-destructive font-medium text-xs"
                >
                  <X className="mr-2 h-3 w-3" />
                  전체 해제
                </CommandItem>
              </CommandGroup>
              
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        selectedValues.has(option) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* 선택된 항목들 표시 - 더 작게 */}
      {selectedValues.size > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {Array.from(selectedValues).slice(0, 2).map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="text-xs px-1 py-0 h-4"
            >
              {value}
              <button
                onClick={() => handleSelect(value)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
          {selectedValues.size > 2 && (
            <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
              +{selectedValues.size - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
