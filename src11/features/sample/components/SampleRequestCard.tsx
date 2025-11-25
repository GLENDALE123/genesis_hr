/**
 * 샘플 요청 카드 컴포넌트 (카드 뷰용)
 * HS-Jig SampleRequestCard 참고
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Image } from 'lucide-react';
import { SampleRequest } from '../types';
import { SAMPLE_STATUS_COLORS } from '../constants';

interface SampleRequestCardProps {
  request: SampleRequest;
  onSelect: () => void;
}

export const SampleRequestCard: React.FC<SampleRequestCardProps> = ({
  request,
  onSelect
}) => {
  const statusColor = SAMPLE_STATUS_COLORS[request.status];
  const imageUrl = request.imageUrls && request.imageUrls[0];
  const items = request.items || [];
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const firstPartName = (items[0] && items[0].partName) || '';
  const coatingMethods = Array.from(
    new Set(items.map(item => item.coatingMethod).filter(Boolean))
  ).join(', ');

  return (
    <Card
      onClick={onSelect}
      className="cursor-pointer overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
    >
      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt={request.productName}
            className="w-full h-40 object-cover"
            loading="lazy"
          />
          {request.imageUrls && request.imageUrls.length > 0 && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Image className="w-3 h-3" />
              {request.imageUrls.length}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          <Image className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-bold truncate pr-2">
            {request.productName} / {firstPartName}
            {items.length > 1 && ` 외 ${items.length - 1}건`}
          </h3>
          <Badge className={statusColor}>{request.status}</Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-1">
          <strong>고객사:</strong> {request.clientName}
        </p>
        
        <p className="text-sm text-muted-foreground mb-1 truncate">
          <strong>코팅방식:</strong> {coatingMethods || 'N/A'}
        </p>
        
        <p className="text-sm text-muted-foreground">
          <strong>총 수량:</strong> {totalQuantity.toLocaleString()}
        </p>
        
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t flex justify-between">
          <span><strong>요청일:</strong> {request.requestDate}</span>
          <span><strong>납기요청:</strong> {request.dueDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};

