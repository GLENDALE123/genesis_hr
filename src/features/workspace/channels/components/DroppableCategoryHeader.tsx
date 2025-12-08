import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/shared/lib/utils';
import { ChannelCategory } from '../types/channel.types';

interface DroppableCategoryHeaderProps {
    category: ChannelCategory | 'general';
    label: string;
    className?: string;
}

export const DroppableCategoryHeader: React.FC<DroppableCategoryHeaderProps> = ({
    category,
    label,
    className,
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `category-header-${category}`,
        data: {
            type: 'category-header',
            category,
        },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide transition-colors rounded-sm',
                isOver && 'bg-primary/10 text-primary',
                className
            )}
        >
            {label}
        </div>
    );
};
